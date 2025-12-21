import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function logApiRequest(
  method: string,
  path: string,
  data?: {
    user?: { id: string; email?: string } | null
    body?: unknown
    queryParams?: Record<string, string>
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
  
  if (data?.queryParams) {
    console.log(`[API ${method}] 🔍 Query Params:`)
    console.log(JSON.stringify(data.queryParams, null, 2))
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
    console.log(`\n[API POST] 🚀 /api/companies - START`)
    console.log(`[API POST] 📍 URL: ${request.url}`)
    
    const supabase = await createClient()
    console.log(`[API POST] 🔐 Checking authentication...`)
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(`[API POST] ❌ Auth Error: ${authError.message}`)
      logApiRequest('POST', '/api/companies', {
        user: null,
        statusCode: 401,
        error: authError,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = authUser
    if (!user) {
      logApiRequest('POST', '/api/companies', {
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
      logApiRequest('POST', '/api/companies', {
        user,
        statusCode: 400,
        error: parseError,
      })
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { search_id, industry, location } = body as {
      search_id?: string
      industry?: string
      location?: string
    }

    console.log(`[API POST] 📋 Extracted params:`)
    console.log(`[API POST]   - search_id: ${search_id || 'N/A'}`)
    console.log(`[API POST]   - industry: ${industry || 'N/A'}`)
    console.log(`[API POST]   - location: ${location || 'N/A'}`)

    if (!search_id || !industry || !location) {
      const missing = []
      if (!search_id) missing.push('search_id')
      if (!industry) missing.push('industry')
      if (!location) missing.push('location')
      
      console.error(`[API POST] ❌ Missing required fields: ${missing.join(', ')}`)
      logApiRequest('POST', '/api/companies', {
        user,
        body,
        statusCode: 400,
        error: `Missing: ${missing.join(', ')}`,
      })
      return NextResponse.json(
        { error: 'search_id, industry and location are required' },
        { status: 400 }
      )
    }

    console.log(`[API POST] ⚠️  Company creation not implemented`)
    const response = { error: 'Company creation not implemented' }
    const duration = Date.now() - startTime
    console.log(`[API POST] ⏱️  Duration: ${duration}ms`)
    
    logApiRequest('POST', '/api/companies', {
      user,
      body,
      statusCode: 501,
      response,
    })

    return NextResponse.json(response, { status: 501 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API POST] ❌ Unhandled error after ${duration}ms`)
    logApiRequest('POST', '/api/companies', {
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

export async function GET(request: Request) {
  const startTime = Date.now()
  let user: { id: string; email?: string } | null = null
  
  try {
    const supabase = await createClient()
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(`[API GET] ❌ Auth Error: ${authError.message}`)
      logApiRequest('GET', '/api/companies', {
        user: null,
        statusCode: 401,
        error: authError,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = authUser
    if (!user) {
      logApiRequest('GET', '/api/companies', {
        user: null,
        statusCode: 401,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const industryParam = searchParams.get('industry')
    const locationParam = searchParams.get('location')
    const searchId = searchParams.get('search') || searchParams.get('search_id')

    const industry = industryParam ? industryParam.trim() : null
    const location = locationParam ? locationParam.trim() : null

    const queryParams: Record<string, string> = {}
    if (industry) queryParams.industry = industry
    if (location) queryParams.location = location
    if (searchId) queryParams.search = searchId
    let query = supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (searchId) {
      query = query.eq('search_id', searchId)
    }
    if (industry) {
      query = query.eq('industry', industry)
    }
    if (location) {
      query = query.eq('location', location)
    }

    const { data, error } = await query

    if (error) {
      console.error(`[API GET] ❌ Database error:`, error.message)
      logApiRequest('GET', '/api/companies', {
        user,
        queryParams,
        statusCode: 500,
        error,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (data && data.length > 0) {
      
      const companyIds = data.map((c: any) => c.id)
      
      const { data: crawlStatuses } = await supabase
        .from('crawl_jobs')
        .select('company_id, status')
        .eq('owner_user_id', user.id)
        .in('company_id', companyIds)
        .order('created_at', { ascending: false })
      
      const latestStatusMap = new Map<string, string>()
      if (crawlStatuses) {
        for (const job of crawlStatuses) {
          if (!latestStatusMap.has(job.company_id)) {
            latestStatusMap.set(job.company_id, job.status)
          }
        }
      }
      
      const { data: emailCounts } = await supabase
        .from('company_emails')
        .select('company_id')
        .eq('owner_user_id', user.id)
        .in('company_id', companyIds)
      
      const countMap = new Map<string, number>()
      if (emailCounts) {
        for (const email of emailCounts) {
          countMap.set(email.company_id, (countMap.get(email.company_id) || 0) + 1)
        }
      }
      
      const enrichedData = data.map((company: any) => ({
        ...company,
        crawl_status: latestStatusMap.get(company.id) || null,
        email_count: countMap.get(company.id) || 0,
      }))
      
      const response = { data: enrichedData }
      const responseObj = NextResponse.json(response, { status: 200 })
      responseObj.headers.set(
        'Cache-Control',
        'private, s-maxage=10, stale-while-revalidate=30'
      )
      return responseObj
    }

    const response = { data: [] }
    const responseObj = NextResponse.json(response, { status: 200 })
    responseObj.headers.set(
      'Cache-Control',
      'private, s-maxage=10, stale-while-revalidate=30'
    )
    return responseObj
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API GET] ❌ Unhandled error after ${duration}ms`)
    logApiRequest('GET', '/api/companies', {
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

