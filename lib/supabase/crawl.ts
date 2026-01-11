import type { SupabaseClient } from '@supabase/supabase-js'

export interface CreateCrawlJobsOptions {
  force?: boolean
  maxJobsPerSearch?: number
  dedupWindowDays?: number
}

export interface CreateCrawlJobsResult {
  created: number
  skipped: number
  skippedReasons: {
    noWebsite: number
    duplicate: number
    limitReached: number
    crawlDisabled: number
    other: number
  }
  errors: Array<{
    companyId: string
    reason: string
  }>
}

const SKIP_REASON_CODES = {
  NO_WEBSITE: 'SKIP_NO_WEBSITE',
  DUPLICATE: 'SKIP_DUPLICATE',
  LIMIT_REACHED: 'SKIP_LIMIT_REACHED',
  CRAWL_DISABLED: 'SKIP_CRAWL_DISABLED',
} as const

export async function createCrawlJobsForCompanies(
  supabase: SupabaseClient,
  companyIds: string[],
  userId: string,
  searchId?: string,
  options: CreateCrawlJobsOptions = {}
): Promise<CreateCrawlJobsResult> {
  const result: CreateCrawlJobsResult = {
    created: 0,
    skipped: 0,
    skippedReasons: {
      noWebsite: 0,
      duplicate: 0,
      limitReached: 0,
      crawlDisabled: 0,
      other: 0,
    },
    errors: [],
  }

  if (process.env.CRAWL_ENABLED !== 'true') {
    console.log('[Crawl] ⚠️  Crawl is disabled (CRAWL_ENABLED !== true)')
    result.skipped = companyIds.length
    result.skippedReasons.crawlDisabled = companyIds.length
    return result
  }

  if (companyIds.length === 0) {
    return result
  }

  const {
    force = false,
    maxJobsPerSearch = 50,
    dedupWindowDays = 7,
  } = options

  const cutoffDate = new Date(
    Date.now() - dedupWindowDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, website, search_id')
    .in('id', companyIds)
    .eq('user_id', userId)

  if (companiesError) {
    console.error('[Crawl] ❌ Error fetching companies:', companiesError)
    companyIds.forEach((id) => {
      result.errors.push({
        companyId: id,
        reason: `Failed to fetch company: ${companiesError.message}`,
      })
    })
    return result
  }

  if (!companies || companies.length === 0) {
    console.log('[Crawl] ⚠️  No companies found')
    return result
  }

  const companiesWithWebsite = companies.filter((c) => c.website)
  const companiesWithoutWebsite = companies.filter((c) => !c.website)

  result.skippedReasons.noWebsite = companiesWithoutWebsite.length
  result.skipped += companiesWithoutWebsite.length

  if (companiesWithWebsite.length === 0) {
    console.log('[Crawl] ⚠️  No companies with website found')
    return result
  }

  const validCompanyIds = companiesWithWebsite.map((c) => c.id)

  if (!force) {
    const { data: pendingRunningJobs, error: checkError1 } = await supabase
      .from('crawl_jobs')
      .select('company_id, status')
      .eq('owner_user_id', userId)
      .in('company_id', validCompanyIds)
      .in('status', ['pending', 'running'])

    if (checkError1) {
      console.error('[Crawl] ❌ Error checking pending/running jobs:', checkError1)
      validCompanyIds.forEach((id) => {
        result.errors.push({
          companyId: id,
          reason: `Failed to check existing jobs: ${checkError1.message}`,
        })
      })
      return result
    }

    const { data: recentDoneJobs, error: checkError2 } = await supabase
      .from('crawl_jobs')
      .select('company_id, status, finished_at')
      .eq('owner_user_id', userId)
      .in('company_id', validCompanyIds)
      .eq('status', 'done')
      .gt('finished_at', cutoffDate)

    if (checkError2) {
      console.error('[Crawl] ❌ Error checking recent done jobs:', checkError2)
      validCompanyIds.forEach((id) => {
        result.errors.push({
          companyId: id,
          reason: `Failed to check recent jobs: ${checkError2.message}`,
        })
      })
      return result
    }

    const blockedCompanyIds = new Set<string>()
    if (pendingRunningJobs) {
      pendingRunningJobs.forEach((job) => {
        blockedCompanyIds.add(job.company_id)
      })
    }
    if (recentDoneJobs) {
      recentDoneJobs.forEach((job) => {
        blockedCompanyIds.add(job.company_id)
      })
    }

    if (searchId) {
      const { data: companiesWithSearchId, error: checkError3 } = await supabase
        .from('companies')
        .select('id')
        .eq('search_id', searchId)
        .eq('user_id', userId)
        .in('id', validCompanyIds)

      if (!checkError3 && companiesWithSearchId && companiesWithSearchId.length > 0) {
        const searchIdCompanyIds = companiesWithSearchId.map((c) => c.id)

        const { data: existingSearchIdJobs } = await supabase
          .from('crawl_jobs')
          .select('company_id')
          .eq('owner_user_id', userId)
          .in('company_id', searchIdCompanyIds)

        if (existingSearchIdJobs) {
          existingSearchIdJobs.forEach((job) => {
            blockedCompanyIds.add(job.company_id)
          })
        }
      }
    }

    const availableCompanyIds = validCompanyIds.filter(
      (id) => !blockedCompanyIds.has(id)
    )

    if (blockedCompanyIds.size > 0) {
      result.skippedReasons.duplicate = blockedCompanyIds.size
      result.skipped += blockedCompanyIds.size
    }

    if (searchId && availableCompanyIds.length > maxJobsPerSearch) {
      const limitedIds = availableCompanyIds.slice(0, maxJobsPerSearch)
      const skippedIds = availableCompanyIds.slice(maxJobsPerSearch)

      result.skippedReasons.limitReached = skippedIds.length
      result.skipped += skippedIds.length

      const jobsToCreate = limitedIds.map((companyId) => ({
        company_id: companyId,
        owner_user_id: userId,
        status: 'pending' as const,
      }))

      const { data: newJobs, error: insertError } = await supabase
        .from('crawl_jobs')
        .insert(jobsToCreate)
        .select()

      if (insertError) {
        console.error('[Crawl] ❌ Error creating jobs:', insertError)
        limitedIds.forEach((id) => {
          result.errors.push({
            companyId: id,
            reason: `Failed to create job: ${insertError.message}`,
          })
        })
      } else {
        result.created = newJobs?.length || 0
        console.log(
          `[Crawl] ✅ Created ${result.created} jobs (${skippedIds.length} skipped due to limit)`
        )
      }
    } else {
      const jobsToCreate = availableCompanyIds.map((companyId) => ({
        company_id: companyId,
        owner_user_id: userId,
        status: 'pending' as const,
      }))

      if (jobsToCreate.length > 0) {
        const { data: newJobs, error: insertError } = await supabase
          .from('crawl_jobs')
          .insert(jobsToCreate)
          .select()

        if (insertError) {
          console.error('[Crawl] ❌ Error creating jobs:', insertError)
          availableCompanyIds.forEach((id) => {
            result.errors.push({
              companyId: id,
              reason: `Failed to create job: ${insertError.message}`,
            })
          })
        } else {
          result.created = newJobs?.length || 0
          console.log(`[Crawl] ✅ Created ${result.created} jobs`)
        }
      }
    }
  } else {
    const jobsToCreate = validCompanyIds.map((companyId) => ({
      company_id: companyId,
      owner_user_id: userId,
      status: 'pending' as const,
    }))

    const { data: newJobs, error: insertError } = await supabase
      .from('crawl_jobs')
      .insert(jobsToCreate)
      .select()

    if (insertError) {
      console.error('[Crawl] ❌ Error creating jobs:', insertError)
      validCompanyIds.forEach((id) => {
        result.errors.push({
          companyId: id,
          reason: `Failed to create job: ${insertError.message}`,
        })
      })
    } else {
      result.created = newJobs?.length || 0
      console.log(`[Crawl] ✅ Created ${result.created} jobs (force mode)`)
    }
  }

  return result
}

