import { createWorkerClient } from './supabase.js'
import { crawlCompanyWebsite, CrawlSkippedError } from './crawler.js'
import { config, HARD_LIMITS } from './config.js'

export interface CrawlJob {
  id: string
  company_id: string
  owner_user_id: string
  status: string
  attempts: number
  last_error: string | null
  skip_reason_code?: string | null
}

export async function processCrawlJob(job: CrawlJob): Promise<void> {
  const supabase = createWorkerClient()
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  console.log(`\n[Worker] 🚀 Processing job ${job.id} - START`)
  console.log(`[Worker] ⏰ ${timestamp}`)
  console.log(`[Worker] 📋 Job Details:`)
  console.log(`[Worker]   - Company ID: ${job.company_id}`)
  console.log(`[Worker]   - Attempt: ${job.attempts}/${HARD_LIMITS.MAX_ATTEMPTS}`)
  console.log(`[Worker]   - Status: ${job.status}`)

  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, website, name')
      .eq('id', job.company_id)
      .single()

    if (companyError) {
      throw new Error(`Failed to fetch company: ${companyError.message}`)
    }

    if (!company.website) {
      await supabase
        .from('crawl_jobs')
        .update({
          status: 'skipped',
          skip_reason_code: 'NO_WEBSITE',
          finished_at: new Date().toISOString(),
          locked_at: null,
          lock_expires_at: null,
        })
        .eq('id', job.id)
      return
    }

    const crawlStartTime = Date.now()
    const crawlResult = await crawlCompanyWebsite(company.website)
    const crawlDuration = Date.now() - crawlStartTime

    console.log(`[Worker] 📊 Crawl results:`)
    console.log(`[Worker]   - Pages crawled: ${crawlResult.pagesCrawled}`)
    console.log(`[Worker]   - Emails found: ${crawlResult.emails.length}`)

    let emailsSaved = 0

    if (crawlResult.emails.length > 0) {
      const emailsToInsert = crawlResult.emails.map((email) => ({
        company_id: job.company_id,
        owner_user_id: job.owner_user_id,
        email: email.email,
        source_url: email.source_url,
        confidence_score: email.confidence_score,
      }))

      const { data: insertedData, error: insertError } = await supabase
        .from('company_emails')
        .upsert(emailsToInsert, {
          onConflict: 'company_id,email,source_url',
          ignoreDuplicates: false,
        })
        .select()

      if (insertError) {
        throw new Error(`Failed to insert emails: ${insertError.message}`)
      }

      emailsSaved = insertedData?.filter((row) => row).length || 0

      if (emailsSaved > 0) {
        console.log(`[Worker] ✅ Successfully saved ${emailsSaved} new emails`)
      } else {
        console.log(`[Worker] ℹ️  All emails already exist (duplicates)`)
      }
    } else {
      console.log(`[Worker] ℹ️  Crawl completed – no emails found`)
    }

    await supabase
      .from('crawl_jobs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', job.id)

    const totalDuration = Date.now() - startTime
    console.log(`[Worker] ⏱️  Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
    console.log(`[Worker] ✅ Job ${job.id} completed successfully`)
    console.log(`[Worker] ✅ END\n`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDuration = Date.now() - startTime

    if (error instanceof CrawlSkippedError) {
      console.log(`[Worker] ⏭️  Job ${job.id} skipped: ${error.reason}`)

      await supabase
        .from('crawl_jobs')
        .update({
          status: 'skipped',
          skip_reason_code: error.skipCode,
          last_error: error.reason,
          finished_at: new Date().toISOString(),
          locked_at: null,
          lock_expires_at: null,
        })
        .eq('id', job.id)

      console.log(`[Worker] ⏭️  END\n`)
      return
    }

    console.error(`[Worker] ❌ Job ${job.id} failed after ${errorDuration}ms`)
    console.error(`[Worker] ❌ Error: ${errorMessage}`)

    const newAttempts = job.attempts + 1
    const shouldRetry = newAttempts < HARD_LIMITS.MAX_ATTEMPTS

    const backoffMs = shouldRetry
      ? Math.min(1000 * Math.pow(2, newAttempts - 1), 30000)
      : 0

    console.log(
      `[Worker] 🔄 Retry: ${shouldRetry ? `Yes (attempt ${newAttempts}/${HARD_LIMITS.MAX_ATTEMPTS}, backoff ${backoffMs}ms)` : 'No (max attempts reached)'}`
    )

    await supabase
      .from('crawl_jobs')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        last_error: errorMessage,
        attempts: newAttempts,
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', job.id)

    if (!shouldRetry) {
      console.log(`[Worker] ⛔ Job ${job.id} exceeded max attempts, marking as failed`)
    }
    console.log(`[Worker] ❌ END\n`)
  }
}

export async function handleGracefulShutdown(job: CrawlJob, startTime: number): Promise<void> {
  const supabase = createWorkerClient()
  const elapsed = Date.now() - startTime
  const progress = elapsed / HARD_LIMITS.MAX_CRAWL_DURATION_MS

  const { data: company } = await supabase
    .from('companies')
    .select('website')
    .eq('id', job.company_id)
    .single()

  let hasEmails = false
  if (company?.website) {
    const { count } = await supabase
      .from('company_emails')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', job.company_id)
      .eq('owner_user_id', job.owner_user_id)
      .limit(1)

    hasEmails = (count || 0) > 0
  }

  if (hasEmails) {
    await supabase
      .from('crawl_jobs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', job.id)
    return
  }

  const newStatus = progress < 0.5 ? 'pending' : 'skipped'
  const skipCode = progress >= 0.5 ? 'SHUTDOWN_50_PERCENT' : null

  await supabase
    .from('crawl_jobs')
    .update({
      status: newStatus,
      skip_reason_code: skipCode,
      locked_at: null,
      lock_expires_at: null,
    })
    .eq('id', job.id)
}

