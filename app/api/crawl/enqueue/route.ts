import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    console.log(`\n[API POST] 🚀 /api/crawl/enqueue - START`)
    console.log(`[API POST] 📍 URL: ${request.url}`)
    
    if (process.env.CRAWL_ENABLED !== 'true') {
      logApiRequest('POST', '/api/crawl/enqueue', {
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
      logApiRequest('POST', '/api/crawl/enqueue', {
        user: null,
        statusCode: 401,
        error: authError,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = authUser
    if (!user) {
      logApiRequest('POST', '/api/crawl/enqueue', {
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
      logApiRequest('POST', '/api/crawl/enqueue', {
        user,
        statusCode: 400,
        error: parseError,
      })
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { company_id, search_id, force } = body as {
      company_id?: string
      search_id?: string
      force?: boolean
    }

    console.log(`[API POST] 📋 Extracted params:`)
    console.log(`[API POST]   - company_id: ${company_id || 'N/A'}`)
    console.log(`[API POST]   - search_id: ${search_id || 'N/A'}`)
    console.log(`[API POST]   - force: ${force || false}`)

    if (!company_id && !search_id) {
      console.error(`[API POST] ❌ Missing required fields: company_id or search_id`)
      logApiRequest('POST', '/api/crawl/enqueue', {
        user,
        body,
        statusCode: 400,
        error: 'company_id or search_id is required',
      })
      return NextResponse.json(
        { error: 'company_id or search_id is required' },
        { status: 400 }
      )
    }

    const dedupWindowDays = 7

    if (company_id) {
      if (!force) {
        const cutoffDate = new Date(Date.now() - dedupWindowDays * 24 * 60 * 60 * 1000).toISOString()
        
        const { data: existingJobs, error: checkError } = await supabase
          .from('crawl_jobs')
          .select('id, status, finished_at')
          .eq('company_id', company_id)
          .eq('owner_user_id', user.id)
          .in('status', ['pending', 'running'])
          .order('created_at', { ascending: false })
          .limit(1)

        let existingJob = existingJobs?.[0]

        if (!existingJob) {
          const { data: recentDoneJobs } = await supabase
            .from('crawl_jobs')
            .select('id, status, finished_at')
            .eq('company_id', company_id)
            .eq('owner_user_id', user.id)
            .eq('status', 'done')
            .gt('finished_at', cutoffDate)
            .order('finished_at', { ascending: false })
            .limit(1)
          
          existingJob = recentDoneJobs?.[0]
        }

        if (checkError) {
          console.error(`[API POST] ❌ Error checking existing job:`, checkError)
          logApiRequest('POST', '/api/crawl/enqueue', {
            user,
            body,
            statusCode: 500,
            error: checkError,
          })
          return NextResponse.json(
            { error: 'Failed to check existing jobs' },
            { status: 500 }
          )
        }

        if (existingJob) {
          const message =
            existingJob.status === 'pending' || existingJob.status === 'running'
              ? 'Job already exists and is pending or running'
              : 'Job already exists and was completed recently'
          console.log(`[API POST] ⚠️  Job exists: ${existingJob.status}`)
          logApiRequest('POST', '/api/crawl/enqueue', {
            user,
            body,
            statusCode: 409,
            error: message,
          })
          return NextResponse.json(
            { error: message, job_id: existingJob.id },
            { status: 409 }
          )
        }
      }

      const { data: newJob, error: insertError } = await supabase
        .from('crawl_jobs')
        .insert({
          company_id,
          owner_user_id: user.id,
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) {
        console.error(`[API POST] ❌ Error creating job:`, insertError)
        logApiRequest('POST', '/api/crawl/enqueue', {
          user,
          body,
          statusCode: 500,
          error: insertError,
        })
        return NextResponse.json(
          { error: 'Failed to create crawl job' },
          { status: 500 }
        )
      }

      const duration = Date.now() - startTime
      console.log(`[API POST] ⏱️  Duration: ${duration}ms`)
      console.log(`[API POST] ✅ Created job: ${newJob.id}`)

      const response = { job_id: newJob.id, company_id: newJob.company_id }
      logApiRequest('POST', '/api/crawl/enqueue', {
        user,
        body,
        statusCode: 201,
        response,
      })

      return NextResponse.json(response, { status: 201 })
    }

    if (search_id) {
      const { data: companies, error: fetchError } = await supabase
        .from('companies')
        .select('id')
        .eq('search_id', search_id)
        .eq('user_id', user.id)

      if (fetchError) {
        console.error(`[API POST] ❌ Error fetching companies:`, fetchError)
        logApiRequest('POST', '/api/crawl/enqueue', {
          user,
          body,
          statusCode: 500,
          error: fetchError,
        })
        return NextResponse.json(
          { error: 'Failed to fetch companies' },
          { status: 500 }
        )
      }

      if (!companies || companies.length === 0) {
        logApiRequest('POST', '/api/crawl/enqueue', {
          user,
          body,
          statusCode: 404,
          error: 'No companies found for search_id',
        })
        return NextResponse.json(
          { error: 'No companies found for search_id' },
          { status: 404 }
        )
      }

      const jobsToCreate: Array<{
        company_id: string
        owner_user_id: string
        status: string
      }> = []

      if (force) {
        for (const company of companies) {
          jobsToCreate.push({
            company_id: company.id,
            owner_user_id: user.id,
            status: 'pending',
          })
        }
      } else {
        const companyIds = companies.map((c) => c.id)
        const cutoffDate = new Date(Date.now() - dedupWindowDays * 24 * 60 * 60 * 1000).toISOString()
        
        const { data: pendingRunningJobs, error: checkError1 } = await supabase
          .from('crawl_jobs')
          .select('company_id, status, finished_at')
          .eq('owner_user_id', user.id)
          .in('company_id', companyIds)
          .in('status', ['pending', 'running'])

        if (checkError1) {
          console.error(`[API POST] ❌ Error checking pending/running jobs:`, checkError1)
          logApiRequest('POST', '/api/crawl/enqueue', {
            user,
            body,
            statusCode: 500,
            error: checkError1,
          })
          return NextResponse.json(
            { error: 'Failed to check existing jobs' },
            { status: 500 }
          )
        }

        const { data: recentDoneJobs, error: checkError2 } = await supabase
          .from('crawl_jobs')
          .select('company_id, status, finished_at')
          .eq('owner_user_id', user.id)
          .in('company_id', companyIds)
          .eq('status', 'done')
          .gt('finished_at', cutoffDate)

        if (checkError2) {
          console.error(`[API POST] ❌ Error checking recent done jobs:`, checkError2)
          logApiRequest('POST', '/api/crawl/enqueue', {
            user,
            body,
            statusCode: 500,
            error: checkError2,
          })
          return NextResponse.json(
            { error: 'Failed to check existing jobs' },
            { status: 500 }
          )
        }

        const existingJobs = [
          ...(pendingRunningJobs || []),
          ...(recentDoneJobs || []),
        ]

        const blockedCompanyIds = new Set(
          existingJobs.map((j) => j.company_id)
        )

        for (const company of companies) {
          if (!blockedCompanyIds.has(company.id)) {
            jobsToCreate.push({
              company_id: company.id,
              owner_user_id: user.id,
              status: 'pending',
            })
          }
        }
      }

      if (jobsToCreate.length === 0) {
        const response = {
          message: 'All companies already have active or recent jobs',
          jobs_created: 0,
        }
        logApiRequest('POST', '/api/crawl/enqueue', {
          user,
          body,
          statusCode: 200,
          response,
        })
        return NextResponse.json(response, { status: 200 })
      }

      const { data: newJobs, error: insertError } = await supabase
        .from('crawl_jobs')
        .insert(jobsToCreate)
        .select()

      if (insertError) {
        console.error(`[API POST] ❌ Error creating jobs:`, insertError)
        logApiRequest('POST', '/api/crawl/enqueue', {
          user,
          body,
          statusCode: 500,
          error: insertError,
        })
        return NextResponse.json(
          { error: 'Failed to create crawl jobs' },
          { status: 500 }
        )
      }

      const duration = Date.now() - startTime
      console.log(`[API POST] ⏱️  Duration: ${duration}ms`)
      console.log(`[API POST] ✅ Created ${newJobs?.length || 0} jobs`)

      const response = {
        jobs_created: newJobs?.length || 0,
        job_ids: newJobs?.map((j) => j.id) || [],
      }
      logApiRequest('POST', '/api/crawl/enqueue', {
        user,
        body,
        statusCode: 201,
        response,
      })

      return NextResponse.json(response, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API POST] ❌ Unhandled error after ${duration}ms`)
    logApiRequest('POST', '/api/crawl/enqueue', {
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

