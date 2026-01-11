import { createDataForSEOClient, DataForSEOClientError } from './client'
import type {
  DataForSEOOrganization,
  DataForSEOEnrichmentStatus,
  DataForSEOOrganizationSearchParams,
} from './types'

export interface EnrichedCompanyData {
  name?: string
  website?: string
  description?: string
  email?: string
  phone?: string
  industry?: string
  location?: string
  dataforseo_organization_id?: string
  dataforseo_enrichment_status: DataForSEOEnrichmentStatus
  dataforseo_error_reason?: string
}

export interface EnrichmentOptions {
  includePerson?: boolean
  includeEmail?: boolean
}

export async function enrichOrganization(
  domain: string
): Promise<DataForSEOOrganization | null> {
  console.log('\n[DataForSEO Enrich] 🔍 enrichOrganization')
  console.log(JSON.stringify({ domain }, null, 2))

  if (!domain) {
    console.log('[DataForSEO Enrich] ⚠️  Skipped: Missing domain')
    return null
  }

  try {
    const client = createDataForSEOClient()
    const response = await client.enrichOrganization(domain)

    const organization = response.organization || null
    if (organization) {
      console.log('[DataForSEO Enrich] ✅ Organization found')
      console.log(
        JSON.stringify(
          {
            id: organization.id,
            name: organization.name,
            website: organization.website_url || organization.domain,
            location: organization.location,
          },
          null,
          2
        )
      )
    } else {
      console.log('[DataForSEO Enrich] ⚠️  No organization found in response')
    }
    console.log('[DataForSEO Enrich] ✅ END enrichOrganization\n')

    return organization
  } catch (error) {
    console.error('[DataForSEO Enrich] ❌ enrichOrganization failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[DataForSEO Enrich] ❌ END enrichOrganization\n')

    if (error instanceof DataForSEOClientError) {
      throw error
    }
    throw new Error(`Failed to enrich organization: ${String(error)}`)
  }
}

export async function enrichCompany(
  website?: string,
  name?: string,
  location?: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedCompanyData> {
  console.log('\n[DataForSEO Enrich] 🏢 enrichCompany START')
  console.log(
    JSON.stringify(
      {
        website,
        name,
        location,
        options,
      },
      null,
      2
    )
  )

  const result: EnrichedCompanyData = {
    dataforseo_enrichment_status: 'pending',
  }

  if (!website && !name) {
    result.dataforseo_enrichment_status = 'skipped'
    result.dataforseo_error_reason = 'Neither website nor name provided'
    console.log('[DataForSEO Enrich] ⚠️  Skipped: Missing website and name')
    console.log('[DataForSEO Enrich] 🏢 enrichCompany END\n')
    return result
  }

  try {
    let domain = website
      ? website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : undefined

    let organization: DataForSEOOrganization | null = null

    if (domain) {
      console.log(`[DataForSEO Enrich] 🔍 Extracted domain: ${domain}`)
      organization = await enrichOrganization(domain)
    }

    if (!organization && name) {
      console.log('[DataForSEO Enrich] 🔍 Trying to find organization by name...')
      try {
        const client = createDataForSEOClient()
        const searchResponse = await client.searchOrganizations({
          keyword: name,
          location: location,
          page: 1,
          per_page: 1,
        })

        if (searchResponse.organizations && searchResponse.organizations.length > 0) {
          organization = searchResponse.organizations[0]
          if (organization) {
            domain = organization.domain || organization.website_url?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
            console.log(`[DataForSEO Enrich] ✅ Organization found by name, domain: ${domain || 'N/A'}`)
          }
        }
      } catch (error) {
        console.error('[DataForSEO Enrich] ⚠️  Organization search by name failed')
        console.error(JSON.stringify({ error: String(error) }, null, 2))
      }
    }

    if (!organization) {
      result.dataforseo_enrichment_status = 'failed'
      result.dataforseo_error_reason = 'Organization not found in DataForSEO'
      console.log('[DataForSEO Enrich] ❌ Organization not found')
      console.log('[DataForSEO Enrich] 🏢 enrichCompany END\n')
      return result
    }

    result.name = organization.name || name
    result.description = organization.description
    result.industry = organization.industry
    result.phone = organization.phone
    result.location = organization.location || location
    result.dataforseo_organization_id = organization.id

    console.log('[DataForSEO Enrich] ✅ Organization data enriched')
    console.log(
      JSON.stringify(
        {
          name: result.name,
          location: result.location,
          dataforseo_organization_id: result.dataforseo_organization_id,
        },
        null,
        2
      )
    )

    result.dataforseo_enrichment_status = 'enriched'
    console.log('[DataForSEO Enrich] ✅ enrichCompany completed successfully')
    console.log(
      JSON.stringify(
        {
          dataforseo_enrichment_status: result.dataforseo_enrichment_status,
          name: result.name,
        },
        null,
        2
      )
    )
    console.log('[DataForSEO Enrich] 🏢 enrichCompany END\n')

    return result
  } catch (error) {
    result.dataforseo_enrichment_status = 'failed'
    if (error instanceof DataForSEOClientError) {
      result.dataforseo_error_reason = error.message
    } else {
      result.dataforseo_error_reason = String(error)
    }

    console.error('[DataForSEO Enrich] ❌ enrichCompany failed')
    console.error(
      JSON.stringify(
        {
          dataforseo_enrichment_status: result.dataforseo_enrichment_status,
          dataforseo_error_reason: result.dataforseo_error_reason,
        },
        null,
        2
      )
    )
    console.error('[DataForSEO Enrich] 🏢 enrichCompany END\n')

    return result
  }
}

export async function searchOrganizations(
  options: {
    location?: string
    industry?: string
    maxResults?: number
    excludeDataForSEOIds?: Set<string>
    excludeWebsites?: Set<string>
  }
): Promise<DataForSEOOrganization[]> {
  console.log('\n[DataForSEO Enrich] 🏢 searchOrganizations START')
  console.log(JSON.stringify(options, null, 2))

  const results: DataForSEOOrganization[] = []
  const maxResults = options.maxResults || 50
  const excludeDataForSEOIds = options.excludeDataForSEOIds || new Set<string>()
  const excludeWebsites = options.excludeWebsites || new Set<string>()

  try {
    const client = createDataForSEOClient()
    let page = 1
    let totalFound = 0
    let totalSkipped = 0

    while (totalFound < maxResults) {
      const perPage = Math.min(25, maxResults - totalFound)

      console.log(`[DataForSEO Enrich] 📄 Searching organizations page ${page} (${perPage} per page)...`)

      const searchResponse = await client.searchOrganizations({
        location: options.location,
        industry: options.industry,
        keyword: options.industry,
        page,
        per_page: perPage,
      })

      const organizations = searchResponse.organizations || []
      if (organizations.length === 0) {
        console.log('[DataForSEO Enrich] ⚠️  No more organizations found')
        break
      }

      console.log(`[DataForSEO Enrich] ✅ Found ${organizations.length} organizations on page ${page}`)

      for (const org of organizations) {
        if (totalFound >= maxResults) break

        if (org.id && excludeDataForSEOIds.has(org.id)) {
          totalSkipped++
          console.log(`[DataForSEO Enrich] ⏭️  Skipping duplicate organization ID: ${org.id}`)
          continue
        }

        const website = org.domain || org.website_url
        if (website) {
          const normalizedWebsite = website.startsWith('http') ? website : `https://${website}`
          if (excludeWebsites.has(normalizedWebsite)) {
            totalSkipped++
            console.log(`[DataForSEO Enrich] ⏭️  Skipping duplicate website: ${normalizedWebsite}`)
            continue
          }
        }

        results.push(org)
        totalFound++
      }

      if (
        !searchResponse.pagination ||
        !searchResponse.pagination.total_entries ||
        page * perPage >= searchResponse.pagination.total_entries
      ) {
        if (totalFound < maxResults && totalSkipped > 0) {
          console.log(`[DataForSEO Enrich] ⚠️  Reached end of results but only found ${totalFound}/${maxResults} new organizations (${totalSkipped} duplicates skipped)`)
        }
        break
      }

      page++
    }

    console.log(`[DataForSEO Enrich] ✅ searchOrganizations completed: ${results.length} organizations found (${totalSkipped} duplicates skipped)`)
    console.log('[DataForSEO Enrich] ✅ END searchOrganizations\n')

    return results
  } catch (error) {
    console.error('[DataForSEO Enrich] ❌ searchOrganizations failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[DataForSEO Enrich] ❌ END searchOrganizations\n')

    if (error instanceof DataForSEOClientError) {
      throw error
    }
    throw new Error(`Failed to search organizations: ${String(error)}`)
  }
}
