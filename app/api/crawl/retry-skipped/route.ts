import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createCrawlJobsForCompanies } from '@/lib/supabase/crawl'

function logApiRequest(
  method: string,
  path: string,
  data?: {
    user?: { id: string; email?: string } | null
    body?: unknown
    statusCode?: number
    response?: unknown
    error?: unknown
  }
) {
  const timestamp = new Date().toISOString()
  console.log(`\n[API ${method}] 📡 ${path}`)
  console.log(`[API ${method}] ⏰ ${timestamp}`)
  
  if (data?.user) {
    console.log(`[API ${method}] 👤 User: ${data.user.id} (${data.user.email || 'N/A'})`)
  } else if (data?.user === null) {
    console.log(`[API ${method}] ⚠️  No authenticated user`)
  }
  
  if (data?.body) {
    console.log(`[API ${method}] 📥 Request Body:`)
    console.log(JSON.stringify(data.body, null, 2))
  }
  
  if (data?.statusCode) {
    console.log(`[API ${method}] 📤 Status: ${data.statusCode}`)
  }
  
  if (data?.response) {
    console.log(`[API ${method}] 📤 Response:`)
    console.log(JSON.stringify(data.response, null, 2))
  }
  
  if (data?.error) {
    console.error(`[API ${method}] ❌ Error:`)
    if (data.error instanceof Error) {
      console.error(`[API ${method}] ❌ Message: ${data.error.message}`)
      console.error(`[API ${method}] ❌ Stack: ${data.error.stack}`)
    } else {
      console.error(JSON.stringify(data.error, null, 2))
    }
  }
  
  console.log(`[API ${method}] ✅ END\n`)
}

export async function POST(request: Request) {
  const startTime = Date.now()
  let user: { id: string; email?: string } | null = null
  
  try {
    console.log(`\n[API POST] 🚀 /api/crawl/retry-skipped - START`)
    console.log(`[API POST] 📍 URL: ${request.url}`)
    
    if (process.env.CRAWL_ENABLED !== 'true') {
      logApiRequest('POST', '/api/crawl/retry-skipped', {
        user: null,
        statusCode: 503,
        error: 'Crawling is disabled',
      })
      return NextResponse.json(
        { error: 'Crawling is currently disabled' },
        { status: 503 }
      )
    }
    
    const supabase = await createClient()
    console.log(`[API POST] 🔐 Checking authentication...`)
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(`[API POST] ❌ Auth Error: ${authError.message}`)
      logApiRequest('POST', '/api/crawl/retry-skipped', {
        user: null,
        statusCode: 401,
        error: authError,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = authUser
    if (!user) {
      logApiRequest('POST', '/api/crawl/retry-skipped', {
        user: null,
        statusCode: 401,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[API POST] ✅ Authenticated as: ${user.id}`)

    let body: unknown
    try {
      body = await request.json()
      console.log(`[API POST] 📥 Request body received`)
    } catch (parseError) {
      console.error(`[API POST] ❌ Failed to parse request body`)
      logApiRequest('POST', '/api/crawl/retry-skipped', {
        user,
        statusCode: 400,
        error: parseError,
      })
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { search_id, skip_reason_code, company_ids } = body as {
      search_id?: string
      skip_reason_code?: string | string[]
      company_ids?: string[]
    }

    console.log(`[API POST] 📋 Extracted params:`)
    console.log(`[API POST]   - search_id: ${search_id || 'N/A'}`)
    console.log(`[API POST]   - skip_reason_code: ${skip_reason_code || 'N/A'}`)
    console.log(`[API POST]   - company_ids: ${company_ids?.length || 0} companies`)

    if (!search_id && !company_ids) {
      console.error(`[API POST] ❌ Missing required fields: search_id or company_ids`)
      logApiRequest('POST', '/api/crawl/retry-skipped', {
        user,
        body,
        statusCode: 400,
        error: 'search_id or company_ids is required',
      })
      return NextResponse.json(
        { error: 'search_id or company_ids is required' },
        { status: 400 }
      )
    }

    let companyIdsToRetry: string[] = []

    if (company_ids && company_ids.length > 0) {
      companyIdsToRetry = company_ids
    } else if (search_id) {
      const query = supabase
        .from('crawl_jobs')
        .select('company_id')
        .eq('owner_user_id', user.id)
        .eq('status', 'skipped')

      if (skip_reason_code) {
        const reasonCodes = Array.isArray(skip_reason_code)
          ? skip_reason_code
          : [skip_reason_code]
        query.in('skip_reason_code', reasonCodes)
      }

      const { data: skippedJobs, error: fetchError } = await query

      if (fetchError) {
        console.error(`[API POST] ❌ Error fetching skipped jobs:`, fetchError)
        logApiRequest('POST', '/api/crawl/retry-skipped', {
          user,
          body,
          statusCode: 500,
          error: fetchError,
        })
        return NextResponse.json(
          { error: 'Failed to fetch skipped jobs' },
          { status: 500 }
        )
      }

      if (!skippedJobs || skippedJobs.length === 0) {
        logApiRequest('POST', '/api/crawl/retry-skipped', {
          user,
          body,
          statusCode: 404,
          error: 'No skipped jobs found',
        })
        return NextResponse.json(
          { error: 'No skipped jobs found matching criteria' },
          { status: 404 }
        )
      }

      const uniqueCompanyIds = Array.from(
        new Set(skippedJobs.map((job) => job.company_id))
      )

      const { data: companies } = await supabase
        .from('companies')
        .select('id, search_id')
        .in('id', uniqueCompanyIds)
        .eq('user_id', user.id)
        .eq('search_id', search_id)

      if (companies) {
        companyIdsToRetry = companies.map((c) => c.id)
      }
    }

    if (companyIdsToRetry.length === 0) {
      logApiRequest('POST', '/api/crawl/retry-skipped', {
        user,
        body,
        statusCode: 404,
        error: 'No companies found to retry',
      })
      return NextResponse.json(
        { error: 'No companies found to retry' },
        { status: 404 }
      )
    }

    console.log(`[API POST] 🔄 Retrying ${companyIdsToRetry.length} skipped companies...`)

    const { error: deleteError } = await supabase
      .from('crawl_jobs')
      .delete()
      .eq('owner_user_id', user.id)
      .in('company_id', companyIdsToRetry)
      .eq('status', 'skipped')

    if (deleteError) {
      console.error(`[API POST] ⚠️  Error deleting old skipped jobs:`, deleteError)
    } else {
      console.log(`[API POST] ✅ Deleted old skipped jobs`)
    }

    const result = await createCrawlJobsForCompanies(
      supabase,
      companyIdsToRetry,
      user.id,
      search_id,
      { force: true }
    )

    if (result.errors.length > 0) {
      console.error(`[API POST] ⚠️  Errors creating jobs:`, result.errors)
    }

    const duration = Date.now() - startTime
    console.log(`[API POST] ⏱️  Duration: ${duration}ms`)
    console.log(`[API POST] ✅ Retry completed:`)
    console.log(`[API POST]   - Created: ${result.created}`)
    console.log(`[API POST]   - Skipped: ${result.skipped}`)
    console.log(`[API POST]   - Errors: ${result.errors.length}`)

    const response = {
      jobs_created: result.created,
      jobs_skipped: result.skipped,
      errors: result.errors,
      skippedReasons: result.skippedReasons,
    }

    logApiRequest('POST', '/api/crawl/retry-skipped', {
      user,
      body,
      statusCode: 201,
      response,
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API POST] ❌ Unhandled error after ${duration}ms`)
    logApiRequest('POST', '/api/crawl/retry-skipped', {
      user,
      statusCode: 500,
      error,
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

