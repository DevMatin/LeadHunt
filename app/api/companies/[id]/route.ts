import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function logApiRequest(
  method: string,
  path: string,
  data?: {
    user?: { id: string; email?: string } | null
    companyId?: string
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
  
  if (data?.companyId) {
    console.log(`[API ${method}] 🏢 Company ID: ${data.companyId}`)
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  let user: { id: string; email?: string } | null = null
  let companyId: string | undefined
  
  try {
    console.log(`\n[API GET] 🚀 /api/companies/[id] - START`)
    console.log(`[API GET] 📍 URL: ${request.url}`)
    
    const supabase = await createClient()
    console.log(`[API GET] 🔐 Checking authentication...`)
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(`[API GET] ❌ Auth Error: ${authError.message}`)
      logApiRequest('GET', '/api/companies/[id]', {
        user: null,
        statusCode: 401,
        error: authError,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = authUser
    if (!user) {
      logApiRequest('GET', '/api/companies/[id]', {
        user: null,
        statusCode: 401,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[API GET] ✅ Authenticated as: ${user.id}`)

    const { id } = await params
    companyId = id
    console.log(`[API GET] 🏢 Looking up company: ${id}`)

    console.log(`[API GET] 🗄️  Executing database query...`)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error(`[API GET] ❌ Database error:`)
      console.error(`[API GET]   - Code: ${error.code || 'N/A'}`)
      console.error(`[API GET]   - Message: ${error.message}`)
      console.error(`[API GET]   - Details: ${error.details || 'N/A'}`)
      console.error(`[API GET]   - Hint: ${error.hint || 'N/A'}`)

      if (error.code === 'PGRST116') {
        console.log(`[API GET] ⚠️  Company not found (PGRST116)`)
        logApiRequest('GET', '/api/companies/[id]', {
          user,
          companyId: id,
          statusCode: 404,
          error: 'Company not found',
        })
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }
      
      logApiRequest('GET', '/api/companies/[id]', {
        user,
        companyId: id,
        statusCode: 500,
        error,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API GET] ✅ Company found`)
    if (data) {
      console.log(`[API GET] 📋 Company data:`)
      console.log(`[API GET]   - Name: ${data.name || 'N/A'}`)
      console.log(`[API GET]   - Industry: ${data.industry || 'N/A'}`)
      console.log(`[API GET]   - Location: ${data.location || 'N/A'}`)
      console.log(`[API GET]   - Website: ${data.website || 'N/A'}`)
      console.log(`[API GET]   - Email: ${data.email || 'N/A'}`)
      console.log(`[API GET]   - Apollo Status: ${data.apollo_enrichment_status || 'N/A'}`)
    }

    const duration = Date.now() - startTime
    console.log(`[API GET] ⏱️  Duration: ${duration}ms`)

    const response = { data }
    logApiRequest('GET', '/api/companies/[id]', {
      user,
      companyId: id,
      statusCode: 200,
      response: { 
        companyId: data?.id,
        name: data?.name,
        hasEmail: !!data?.email,
      },
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API GET] ❌ Unhandled error after ${duration}ms`)
    logApiRequest('GET', '/api/companies/[id]', {
      user,
      companyId,
      statusCode: 500,
      error,
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

