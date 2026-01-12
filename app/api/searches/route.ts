import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchOrganizations } from '@/lib/integrations/dataforseo/enrich'
import { createDataForSEOClient } from '@/lib/integrations/dataforseo/client'
import { DataForSEOClientError } from '@/lib/integrations/dataforseo/client'
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

    const { industry, location, location_coordinate, maxResults } = body as {
      industry?: string
      location?: string
      location_coordinate?: string
      maxResults?: number
    }

    console.log(`[API POST] 📋 Extracted params:`)
    console.log(`[API POST]   - industry: ${industry || 'N/A'}`)
    console.log(`[API POST]   - location: ${location || 'N/A'}`)
    console.log(`[API POST]   - location_coordinate: ${location_coordinate || 'N/A'}`)

    if (!industry) {
      console.error(`[API POST] ❌ Missing required field: industry`)
      logApiRequest('POST', '/api/searches', {
        user,
        body,
        statusCode: 400,
        error: 'Missing: industry',
      })
      return NextResponse.json(
        { error: 'Industry is required' },
        { status: 400 }
      )
    }

    if (!location && !location_coordinate) {
      console.error(`[API POST] ❌ Missing required field: location or location_coordinate`)
      logApiRequest('POST', '/api/searches', {
        user,
        body,
        statusCode: 400,
        error: 'Missing: location or location_coordinate',
      })
      return NextResponse.json(
        { error: 'Location or location coordinate is required' },
        { status: 400 }
      )
    }

    const locationValue = location_coordinate || location || ''

    console.log(`[API POST] 🗄️  Inserting search into database...`)
    console.log(`[API POST]   - user_id: ${user.id}`)
    console.log(`[API POST]   - industry: ${industry}`)
    console.log(`[API POST]   - location: ${locationValue}`)

    const { data, error } = await supabase
      .from('searches')
      .insert({
        user_id: user.id,
        industry,
        location: locationValue,
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

    const dataforseoEnabled = process.env.DATAFORSEO_ENABLED === 'true'
    const dataforseoLogin = process.env.DATAFORSEO_LOGIN
    const dataforseoPassword = process.env.DATAFORSEO_PASSWORD
    let companiesCreated = 0

    console.log(`[API POST] 🔧 DataForSEO Configuration:`)
    console.log(`[API POST]   - DATAFORSEO_ENABLED: ${process.env.DATAFORSEO_ENABLED || 'not set'}`)
    console.log(`[API POST]   - DATAFORSEO_LOGIN: ${dataforseoLogin ? '***SET***' : 'NOT SET'}`)
    console.log(`[API POST]   - DATAFORSEO_PASSWORD: ${dataforseoPassword ? '***SET***' : 'NOT SET'}`)
    console.log(`[API POST]   - DataForSEO Enabled: ${dataforseoEnabled}`)

    if (dataforseoEnabled && data && dataforseoLogin && dataforseoPassword) {
      try {
        console.log(`[API POST] 🔍 Starting DataForSEO search...`)
        console.log(`[API POST]   - Industry: ${industry}`)
        console.log(`[API POST]   - Location: ${locationValue}`)
        console.log(`[API POST]   - Location Coordinate: ${location_coordinate || 'N/A'}`)

        const normalizedIndustry = industry.trim()

        console.log(`[API POST] 🏢 Searching for ORGANIZATIONS by industry and location...`)
        console.log(`[API POST]   - Industry: ${normalizedIndustry}`)
        console.log(`[API POST]   - Location: ${locationValue}`)

        try {
          const maxResultsValue = maxResults && maxResults > 0 ? Math.min(maxResults, 1000) : 100
          console.log(`[API POST] 📊 Max Results: ${maxResultsValue}`)
          
          let categoryName = normalizedIndustry
          const { data: categoryData } = await supabase
            .from('dataforseo_categories')
            .select('category_name')
            .ilike('category_name', `%${normalizedIndustry}%`)
            .order('business_count', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (categoryData?.category_name) {
            categoryName = categoryData.category_name
            console.log(`[API POST] ✅ Found matching category: ${categoryName}`)
          } else {
            console.log(`[API POST] ℹ️  Using industry as category: ${categoryName}`)
          }
          
          const { data: existingCompanies } = await supabase
            .from('companies')
            .select('dataforseo_organization_id, website')
            .eq('user_id', user.id)
            .not('dataforseo_organization_id', 'is', null)

          const excludeDataForSEOIds = new Set<string>()
          const excludeWebsites = new Set<string>()

          if (existingCompanies) {
            for (const company of existingCompanies) {
              if (company.dataforseo_organization_id) {
                excludeDataForSEOIds.add(company.dataforseo_organization_id)
              }
              if (company.website) {
                excludeWebsites.add(company.website)
              }
            }
            console.log(`[API POST] 🚫 Excluding ${excludeDataForSEOIds.size} existing DataForSEO IDs and ${excludeWebsites.size} existing websites`)
          }
          
          const organizations = await searchOrganizations({
            location: location_coordinate ? undefined : locationValue,
            location_coordinate: location_coordinate,
            industry: normalizedIndustry,
            category: categoryName,
            maxResults: maxResultsValue,
            excludeDataForSEOIds,
            excludeWebsites,
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
              dataforseo_organization_id?: string
              dataforseo_enrichment_status?: string
              dataforseo_full_data?: Record<string, unknown>
              dataforseo_category_ids?: string[]
              dataforseo_place_id?: string
              dataforseo_cid?: string
              dataforseo_feature_id?: string
              dataforseo_latitude?: number
              dataforseo_longitude?: number
              dataforseo_rating_value?: number
              dataforseo_rating_votes_count?: number
              dataforseo_price_level?: string
              dataforseo_is_claimed?: boolean
              dataforseo_logo?: string
              dataforseo_main_image?: string
              dataforseo_total_photos?: number
              dataforseo_city?: string
              dataforseo_zip?: string
              dataforseo_country_code?: string
            }> = []

            let skippedDuplicates = 0
            let organizationsWithoutWebsite = 0

            for (const org of organizations) {
              if (!org.id) {
                console.log(`[API POST] ⚠️  Skipping organization: No ID`)
                continue
              }

              let website: string | null = null
              if (org.domain) {
                const domain = org.domain.startsWith('http') 
                  ? org.domain 
                  : `https://${org.domain}`
                website = domain
              } else if (org.website_url) {
                website = org.website_url.startsWith('http') 
                  ? org.website_url 
                  : `https://${org.website_url}`
              }

              if (!website) {
                organizationsWithoutWebsite++
                console.log(`[API POST] ⚠️  Organization ${org.id} has no website, but will be saved anyway`)
              }

              const { data: existingCompany } = await supabase
                .from('companies')
                .select('id')
                .eq('user_id', user.id)
                .eq('dataforseo_organization_id', org.id)
                .maybeSingle()

              if (existingCompany) {
                skippedDuplicates++
                console.log(`[API POST] ⚠️  Skipping duplicate: Company with organization ID ${org.id} already exists`)
                continue
              }

              if (website) {
                const { data: existingCompanyByWebsite } = await supabase
                  .from('companies')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('website', website)
                  .maybeSingle()

                if (existingCompanyByWebsite) {
                  skippedDuplicates++
                  console.log(`[API POST] ⚠️  Skipping duplicate: Company with website ${website} already exists`)
                  continue
                }
              }

              const companyName = org.name || 'Unknown Company'
              
              let companyLocation = locationValue
              if (org.location && org.location.trim()) {
                companyLocation = org.location.trim()
              } else if (location && !location_coordinate) {
                companyLocation = location
              }
              
              let companyIndustry = normalizedIndustry
              if (org.industry && org.industry.trim()) {
                companyIndustry = org.industry.trim()
              }

              const fullData = org.full_data || {}
              const addressInfo = (fullData as { address_info?: Record<string, unknown> }).address_info || {}
              const rating = (fullData as { rating?: Record<string, unknown> }).rating || {}
              
              const companyData: typeof companiesToInsert[0] = {
                user_id: user.id,
                search_id: data.id,
                name: companyName,
                industry: companyIndustry,
                location: companyLocation,
                website: website,
                status: 'new',
                dataforseo_organization_id: org.id,
                dataforseo_enrichment_status: 'enriched',
                dataforseo_full_data: fullData,
                dataforseo_category_ids: (fullData as { category_ids?: string[] }).category_ids || undefined,
                dataforseo_place_id: (fullData as { place_id?: string }).place_id || undefined,
                dataforseo_cid: (fullData as { cid?: string }).cid || undefined,
                dataforseo_feature_id: (fullData as { feature_id?: string }).feature_id || undefined,
                dataforseo_latitude: (fullData as { latitude?: number }).latitude || undefined,
                dataforseo_longitude: (fullData as { longitude?: number }).longitude || undefined,
                dataforseo_rating_value: rating.value ? Number(rating.value) : undefined,
                dataforseo_rating_votes_count: rating.votes_count ? Number(rating.votes_count) : undefined,
                dataforseo_price_level: (fullData as { price_level?: string }).price_level || undefined,
                dataforseo_is_claimed: (fullData as { is_claimed?: boolean }).is_claimed || undefined,
                dataforseo_logo: (fullData as { logo?: string }).logo || undefined,
                dataforseo_main_image: (fullData as { main_image?: string }).main_image || undefined,
                dataforseo_total_photos: (fullData as { total_photos?: number }).total_photos || undefined,
                dataforseo_city: (addressInfo as { city?: string }).city || undefined,
                dataforseo_zip: (addressInfo as { zip?: string }).zip || undefined,
                dataforseo_country_code: (addressInfo as { country_code?: string }).country_code || undefined,
              }

              companiesToInsert.push(companyData)

              console.log(`[API POST] ✅ Prepared company: ${companyName} (${website})`)
            }

            console.log(`[API POST] 📊 Summary:`)
            console.log(`[API POST]   - Total organizations found: ${organizations.length}`)
            console.log(`[API POST]   - Organizations without website: ${organizationsWithoutWebsite} (will be saved anyway)`)
            console.log(`[API POST]   - Skipped (duplicates): ${skippedDuplicates}`)
            console.log(`[API POST]   - Companies to insert: ${companiesToInsert.length}`)

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

                if (companiesCreated > 0 && insertedCompanies) {
                  const autoCrawlEnabled = process.env.AUTO_CRAWL_ON_SEARCH === 'true'
                  const crawlEnabled = process.env.CRAWL_ENABLED === 'true'

                  if (autoCrawlEnabled && crawlEnabled) {
                    const companyIds = insertedCompanies.map((c) => c.id)
                    
                    console.log(`[API POST] 🚀 Starting automatic crawl job creation for ${companyIds.length} companies...`)
                    console.log(`[API POST]   - Search ID: ${data.id}`)
                    
                    createCrawlJobsForCompanies(
                      supabase,
                      companyIds,
                      user.id,
                      data.id,
                      { force: false }
                    )
                      .then((result) => {
                        console.log(`[API POST] ✅ Auto-crawl completed:`)
                        console.log(`[API POST]   - Created: ${result.created}`)
                        console.log(`[API POST]   - Skipped: ${result.skipped}`)
                        console.log(`[API POST]   - Reasons:`, JSON.stringify(result.skippedReasons, null, 2))
                        
                        if (result.errors.length > 0) {
                          console.error(`[API POST] ⚠️  Auto-crawl errors:`)
                          result.errors.forEach((error) => {
                            console.error(`[API POST]   - Company ${error.companyId}: ${error.reason}`)
                          })
                        }
                      })
                      .catch((error) => {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        console.error(`[API POST] ❌ Auto-crawl failed (non-blocking):`)
                        console.error(`[API POST]   - Search ID: ${data.id}`)
                        console.error(`[API POST]   - Error: ${errorMessage}`)
                        if (error instanceof Error && error.stack) {
                          console.error(`[API POST]   - Stack: ${error.stack}`)
                        }
                      })
                  } else {
                    if (!autoCrawlEnabled) {
                      console.log(`[API POST] ℹ️  Auto-crawl disabled (AUTO_CRAWL_ON_SEARCH=${process.env.AUTO_CRAWL_ON_SEARCH || 'not set'})`)
                    }
                    if (!crawlEnabled) {
                      console.log(`[API POST] ℹ️  Crawl disabled (CRAWL_ENABLED=${process.env.CRAWL_ENABLED || 'not set'})`)
                    }
                  }
                }
              }
            }

            if (skippedDuplicates > 0) {
              console.log(`[API POST] ⚠️  Skipped ${skippedDuplicates} duplicates`)
            }
            if (organizationsWithoutWebsite > 0) {
              console.log(`[API POST] ℹ️  ${organizationsWithoutWebsite} organizations without website (saved anyway)`)
            }
          }
        } catch (orgSearchError) {
          const errorMessage = orgSearchError instanceof Error ? orgSearchError.message : String(orgSearchError)
          console.error(`[API POST] ❌ Organization Search failed: ${errorMessage}`)
          if (errorMessage.includes('not accessible') || errorMessage.includes('authentication')) {
            console.error(`[API POST] 💡 Mögliche Ursachen:`)
            console.error(`[API POST]   1. Login/Password hat noch nicht die richtigen Berechtigungen`)
            console.error(`[API POST]   2. Server muss neu gestartet werden`)
            console.error(`[API POST]   3. Login/Password muss in .env aktualisiert werden`)
            console.error(`[API POST]   4. Abonnement-Berechtigungen sind noch nicht aktiv`)
          }
          throw orgSearchError
        }
      } catch (dataforseoError) {
        const errorMessage = dataforseoError instanceof Error ? dataforseoError.message : String(dataforseoError)
        console.error(`[API POST] ⚠️  DataForSEO search failed, but search was saved:`)
        console.error(`[API POST]   - Error: ${errorMessage}`)
        
        if (dataforseoError instanceof Error && dataforseoError.stack) {
          console.error(`[API POST]   - Stack: ${dataforseoError.stack}`)
        }
      }
    } else {
      if (!dataforseoEnabled) {
        console.log(`[API POST] ℹ️  DataForSEO is disabled (DATAFORSEO_ENABLED=${process.env.DATAFORSEO_ENABLED || 'not set'})`)
      }
      if (!dataforseoLogin || !dataforseoPassword) {
        console.log(`[API POST] ⚠️  DataForSEO credentials are not set (DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD not found)`)
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

