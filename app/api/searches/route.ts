import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchOrganizations } from '@/lib/integrations/apollo/enrich'
import { createApolloClient } from '@/lib/integrations/apollo/client'
import { ApolloClientError } from '@/lib/integrations/apollo/client'

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
    console.log(`\n[API POST] 🚀 /api/searches - START`)
    console.log(`[API POST] 📍 URL: ${request.url}`)
    
    const supabase = await createClient()
    console.log(`[API POST] 🔐 Checking authentication...`)
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(`[API POST] ❌ Auth Error: ${authError.message}`)
      logApiRequest('POST', '/api/searches', {
        user: null,
        statusCode: 401,
        error: authError,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = authUser
    if (!user) {
      logApiRequest('POST', '/api/searches', {
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
      logApiRequest('POST', '/api/searches', {
        user,
        statusCode: 400,
        error: parseError,
      })
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { industry, location, maxResults } = body as {
      industry?: string
      location?: string
      maxResults?: number
    }

    console.log(`[API POST] 📋 Extracted params:`)
    console.log(`[API POST]   - industry: ${industry || 'N/A'}`)
    console.log(`[API POST]   - location: ${location || 'N/A'}`)

    if (!industry || !location) {
      const missing = []
      if (!industry) missing.push('industry')
      if (!location) missing.push('location')
      
      console.error(`[API POST] ❌ Missing required fields: ${missing.join(', ')}`)
      logApiRequest('POST', '/api/searches', {
        user,
        body,
        statusCode: 400,
        error: `Missing: ${missing.join(', ')}`,
      })
      return NextResponse.json(
        { error: 'Industry and location are required' },
        { status: 400 }
      )
    }

    console.log(`[API POST] 🗄️  Inserting search into database...`)
    console.log(`[API POST]   - user_id: ${user.id}`)
    console.log(`[API POST]   - industry: ${industry}`)
    console.log(`[API POST]   - location: ${location}`)

    const { data, error } = await supabase
      .from('searches')
      .insert({
        user_id: user.id,
        industry,
        location,
      })
      .select()
      .single()

    if (error) {
      console.error(`[API POST] ❌ Database error:`)
      console.error(`[API POST]   - Code: ${error.code || 'N/A'}`)
      console.error(`[API POST]   - Message: ${error.message}`)
      console.error(`[API POST]   - Details: ${error.details || 'N/A'}`)
      console.error(`[API POST]   - Hint: ${error.hint || 'N/A'}`)
      
      logApiRequest('POST', '/api/searches', {
        user,
        body,
        statusCode: 500,
        error,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API POST] ✅ Search created successfully`)
    if (data) {
      console.log(`[API POST] 📋 Created search:`)
      console.log(`[API POST]   - ID: ${data.id}`)
      console.log(`[API POST]   - Industry: ${data.industry}`)
      console.log(`[API POST]   - Location: ${data.location}`)
      console.log(`[API POST]   - Created at: ${data.created_at}`)
    }

    const apolloEnabled = process.env.APOLLO_ENABLED === 'true'
    const apolloApiKey = process.env.APOLLO_API_KEY
    let companiesCreated = 0

    console.log(`[API POST] 🔧 Apollo Configuration:`)
    console.log(`[API POST]   - APOLLO_ENABLED: ${process.env.APOLLO_ENABLED || 'not set'}`)
    console.log(`[API POST]   - APOLLO_API_KEY: ${apolloApiKey ? '***SET***' : 'NOT SET'}`)
    console.log(`[API POST]   - Apollo Enabled: ${apolloEnabled}`)

    if (apolloEnabled && data && apolloApiKey) {
      try {
        console.log(`[API POST] 🔍 Starting Apollo search...`)
        console.log(`[API POST]   - Industry: ${industry}`)
        console.log(`[API POST]   - Location: ${location}`)

        const normalizedLocation = location.trim()
        const normalizedIndustry = industry.trim()

        console.log(`[API POST] 🏢 Searching for ORGANIZATIONS by industry and location...`)
        console.log(`[API POST]   - Industry: ${normalizedIndustry}`)
        console.log(`[API POST]   - Location: ${normalizedLocation}`)

        try {
          const maxResultsValue = maxResults && maxResults > 0 ? Math.min(maxResults, 1000) : 100
          console.log(`[API POST] 📊 Max Results: ${maxResultsValue}`)
          
          const organizations = await searchOrganizations({
            organization_locations: [normalizedLocation],
            q_keywords: normalizedIndustry,
            maxResults: maxResultsValue,
          })

          console.log(`[API POST] ✅ Found ${organizations.length} organizations`)

          if (organizations.length === 0) {
            console.log(`[API POST] ⚠️  No organizations found`)
          } else {
            const companiesToInsert: Array<{
              user_id: string
              search_id: string
              name: string
              industry: string
              location: string
              website: string | null
              status: 'new'
              apollo_organization_id?: string
              apollo_enrichment_status?: string
            }> = []

            let skippedDuplicates = 0
            let skippedNoWebsite = 0

            for (const org of organizations) {
              if (!org.id) {
                console.log(`[API POST] ⚠️  Skipping organization: No ID`)
                continue
              }

              let website: string | null = null
              if (org.primary_domain) {
                const domain = org.primary_domain.startsWith('http') 
                  ? org.primary_domain 
                  : `https://${org.primary_domain}`
                website = domain
              } else if (org.website_url) {
                website = org.website_url.startsWith('http') 
                  ? org.website_url 
                  : `https://${org.website_url}`
              }

              if (!website) {
                skippedNoWebsite++
                console.log(`[API POST] ⚠️  Skipping organization ${org.id}: No website found`)
                continue
              }

              const { data: existingCompany } = await supabase
                .from('companies')
                .select('id')
                .eq('user_id', user.id)
                .eq('search_id', data.id)
                .eq('apollo_organization_id', org.id)
                .maybeSingle()

              if (existingCompany) {
                skippedDuplicates++
                console.log(`[API POST] ⚠️  Skipping duplicate: Company with organization ID ${org.id} already exists for this search`)
                continue
              }

              const companyName = org.name || 'Unknown Company'
              const companyLocation = org.city && org.country
                ? `${org.city}, ${org.country}`
                : org.city || org.country || normalizedLocation
              const companyIndustry = org.industry || org.industries?.[0] || normalizedIndustry

              companiesToInsert.push({
                user_id: user.id,
                search_id: data.id,
                name: companyName,
                industry: companyIndustry,
                location: companyLocation,
                website: website,
                status: 'new',
                apollo_organization_id: org.id,
                apollo_enrichment_status: 'enriched',
              })

              console.log(`[API POST] ✅ Prepared company: ${companyName} (${website})`)
            }

            if (companiesToInsert.length > 0) {
              console.log(`[API POST] 🗄️  Saving ${companiesToInsert.length} companies to database...`)

              const { data: insertedCompanies, error: insertError } = await supabase
                .from('companies')
                .insert(companiesToInsert)
                .select()

              if (insertError) {
                console.error(`[API POST] ⚠️  Error inserting companies: ${insertError.message}`)
              } else {
                companiesCreated = insertedCompanies?.length || 0
                console.log(`[API POST] ✅ Created ${companiesCreated} companies`)
              }
            }

            if (skippedDuplicates > 0) {
              console.log(`[API POST] ⚠️  Skipped ${skippedDuplicates} duplicates`)
            }
            if (skippedNoWebsite > 0) {
              console.log(`[API POST] ⚠️  Skipped ${skippedNoWebsite} organizations without website`)
            }
          }
        } catch (orgSearchError) {
          const errorMessage = orgSearchError instanceof Error ? orgSearchError.message : String(orgSearchError)
          console.error(`[API POST] ❌ Organization Search failed: ${errorMessage}`)
          if (errorMessage.includes('not accessible with this api_key')) {
            console.error(`[API POST] 💡 Mögliche Ursachen:`)
            console.error(`[API POST]   1. API Key hat noch nicht die richtigen Berechtigungen`)
            console.error(`[API POST]   2. Server muss neu gestartet werden`)
            console.error(`[API POST]   3. API Key muss in .env aktualisiert werden`)
            console.error(`[API POST]   4. Abonnement-Berechtigungen sind noch nicht aktiv`)
            console.error(`[API POST]   5. api/v1/mixed_companies/search muss aktiviert sein`)
          }
          throw orgSearchError
        }
      } catch (apolloError) {
        const errorMessage = apolloError instanceof Error ? apolloError.message : String(apolloError)
        console.error(`[API POST] ⚠️  Apollo search failed, but search was saved:`)
        console.error(`[API POST]   - Error: ${errorMessage}`)
        
        if (errorMessage.includes('free plan') || errorMessage.includes('API_INACCESSIBLE')) {
          console.error(`[API POST] ❌ Organization API Search is not available on Free Plan`)
          console.error(`[API POST] 💡 Upgrade your Apollo plan to use Organization Search: https://app.apollo.io/`)
        }
        
        if (apolloError instanceof Error && apolloError.stack) {
          console.error(`[API POST]   - Stack: ${apolloError.stack}`)
        }
      }
    } else {
      if (!apolloEnabled) {
        console.log(`[API POST] ℹ️  Apollo is disabled (APOLLO_ENABLED=${process.env.APOLLO_ENABLED || 'not set'})`)
      }
      if (!apolloApiKey) {
        console.log(`[API POST] ⚠️  Apollo API key is not set (APOLLO_API_KEY not found)`)
      }
      if (!data) {
        console.log(`[API POST] ⚠️  Search data is missing`)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[API POST] ⏱️  Duration: ${duration}ms`)

    const response = { 
      data,
      companiesCreated,
    }
    logApiRequest('POST', '/api/searches', {
      user,
      body,
      statusCode: 201,
      response: { 
        searchId: data?.id,
        industry: data?.industry,
        location: data?.location,
        companiesCreated,
      },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API POST] ❌ Unhandled error after ${duration}ms`)
    logApiRequest('POST', '/api/searches', {
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

