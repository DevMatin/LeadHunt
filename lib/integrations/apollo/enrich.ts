import { createApolloClient, ApolloClientError } from './client'
import type {
  ApolloOrganization,
  ApolloPerson,
  ApolloEnrichmentStatus,
  EnrichedPersonResult,
  SearchAndEnrichOptions,
} from './types'

export interface EnrichedCompanyData {
  name?: string
  website?: string
  description?: string
  email?: string
  phone?: string
  industry?: string
  location?: string
  apollo_organization_id?: string
  apollo_enrichment_status: ApolloEnrichmentStatus
  apollo_error_reason?: string
}

export interface EnrichmentOptions {
  includePerson?: boolean
  includeEmail?: boolean
  personTitles?: string[]
}

export async function enrichOrganization(
  domain: string
): Promise<ApolloOrganization | null> {
  console.log('\n[Apollo Enrich] 🔍 enrichOrganization')
  console.log(JSON.stringify({ domain }, null, 2))

  if (!domain) {
    console.log('[Apollo Enrich] ⚠️  Skipped: Missing domain')
    return null
  }

  try {
    const client = createApolloClient()
    const response = await client.enrichOrganization({
      domain,
    })

    const organization = response.organization || null
    if (organization) {
      console.log('[Apollo Enrich] ✅ Organization found')
      console.log(
        JSON.stringify(
          {
            id: organization.id,
            name: organization.name,
            website: organization.website_url || organization.primary_domain,
            industry: organization.industry,
            location: `${organization.city || ''}, ${organization.country || ''}`,
          },
          null,
          2
        )
      )
    } else {
      console.log('[Apollo Enrich] ⚠️  No organization found in response')
    }
    console.log('[Apollo Enrich] ✅ END enrichOrganization\n')

    return organization
  } catch (error) {
    console.error('[Apollo Enrich] ❌ enrichOrganization failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END enrichOrganization\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to enrich organization: ${String(error)}`)
  }
}

export async function findTopDecisionMaker(
  organizationId: string,
  organizationName?: string,
  titles?: string[]
): Promise<ApolloPerson | null> {
  console.log('\n[Apollo Enrich] 👤 findTopDecisionMaker')
  console.log(
    JSON.stringify(
      {
        organizationId,
        organizationName,
        titles: titles || [
          'CEO',
          'Chief Executive Officer',
          'Founder',
          'Co-Founder',
          'President',
          'Owner',
        ],
      },
      null,
      2
    )
  )

  try {
    const client = createApolloClient()
    const response = await client.searchPeople({
      organization_id: organizationId,
      organization_name: organizationName,
      person_titles: titles || [
        'CEO',
        'Chief Executive Officer',
        'Founder',
        'Co-Founder',
        'President',
        'Owner',
      ],
      page: 1,
      per_page: 1,
    })

    if (response.people && response.people.length > 0) {
      const person = response.people[0]
      console.log('[Apollo Enrich] ✅ Person found')
      console.log(
        JSON.stringify(
          {
            id: person.id,
            name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
            title: person.title,
            email: person.email,
            emailStatus: person.email_status,
          },
          null,
          2
        )
      )
      console.log('[Apollo Enrich] ✅ END findTopDecisionMaker\n')
      return person
    }

    console.log('[Apollo Enrich] ⚠️  No person found')
    console.log('[Apollo Enrich] ✅ END findTopDecisionMaker\n')
    return null
  } catch (error) {
    console.error('[Apollo Enrich] ❌ findTopDecisionMaker failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END findTopDecisionMaker\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to find person: ${String(error)}`)
  }
}

export async function findEmail(
  personId: string,
  firstName?: string,
  lastName?: string,
  domain?: string
): Promise<string | null> {
  console.log('\n[Apollo Enrich] 📧 findEmail')
  console.log(
    JSON.stringify(
      { personId, firstName, lastName, domain },
      null,
      2
    )
  )

  try {
    const client = createApolloClient()
    const response = await client.matchEmail({
      id: personId,
      first_name: firstName,
      last_name: lastName,
      domain,
    })

    const email = response.person?.email
    const emailStatus = response.person?.email_status

    if (email && emailStatus === 'verified') {
      console.log('[Apollo Enrich] ✅ Verified email found')
      console.log(JSON.stringify({ email, emailStatus }, null, 2))
      console.log('[Apollo Enrich] ✅ END findEmail\n')
      return email
    }

    if (email) {
      console.log('[Apollo Enrich] ⚠️  Email found but not verified')
      console.log(JSON.stringify({ email, emailStatus }, null, 2))
    } else {
      console.log('[Apollo Enrich] ⚠️  No email found')
    }
    console.log('[Apollo Enrich] ✅ END findEmail\n')

    return email || null
  } catch (error) {
    console.error('[Apollo Enrich] ❌ findEmail failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END findEmail\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to find email: ${String(error)}`)
  }
}

export async function enrichCompany(
  website?: string,
  name?: string,
  location?: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedCompanyData> {
  console.log('\n[Apollo Enrich] 🏢 enrichCompany START')
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
    apollo_enrichment_status: 'pending',
  }

  if (!website && !name) {
    result.apollo_enrichment_status = 'skipped'
    result.apollo_error_reason = 'Neither website nor name provided'
    console.log('[Apollo Enrich] ⚠️  Skipped: Missing website and name')
    console.log('[Apollo Enrich] 🏢 enrichCompany END\n')
    return result
  }

  try {
    const domain = website
      ? website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : undefined

    console.log(`[Apollo Enrich] 🔍 Extracted domain: ${domain || 'N/A'}`)

    if (!domain) {
      result.apollo_enrichment_status = 'failed'
      result.apollo_error_reason = 'Domain is required for organization enrichment'
      console.log('[Apollo Enrich] ❌ Domain required but not found')
      console.log('[Apollo Enrich] 🏢 enrichCompany END\n')
      return result
    }

    const organization = await enrichOrganization(domain)

    if (!organization) {
      result.apollo_enrichment_status = 'failed'
      result.apollo_error_reason = 'Organization not found in Apollo'
      console.log('[Apollo Enrich] ❌ Organization not found')
      console.log('[Apollo Enrich] 🏢 enrichCompany END\n')
      return result
    }

    result.name = organization.name || name
    result.website = organization.website_url || organization.primary_domain || website
    result.description = organization.description
    result.industry = organization.industry || organization.industries?.[0]
    result.phone =
      organization.primary_phone?.number ||
      organization.phone ||
      organization.sanitized_phone
    result.location = organization.city
      ? `${organization.city}${organization.state ? `, ${organization.state}` : ''}${organization.country ? `, ${organization.country}` : ''}`
      : location
    result.apollo_organization_id = organization.id

    console.log('[Apollo Enrich] ✅ Organization data enriched')
    console.log(
      JSON.stringify(
        {
          name: result.name,
          website: result.website,
          industry: result.industry,
          location: result.location,
          apollo_organization_id: result.apollo_organization_id,
        },
        null,
        2
      )
    )

    if (options.includePerson && organization.id) {
      console.log('[Apollo Enrich] 🔍 Starting person enrichment...')
      try {
        const person = await findTopDecisionMaker(
          organization.id,
          organization.name,
          options.personTitles
        )

        if (person && options.includeEmail) {
          console.log('[Apollo Enrich] 🔍 Starting email lookup...')
          const email = await findEmail(
            person.id || '',
            person.first_name,
            person.last_name,
            domain
          )
          if (email) {
            result.email = email
            console.log(`[Apollo Enrich] ✅ Email found: ${email}`)
          }
        } else if (person?.email && person.email_status === 'verified') {
          result.email = person.email
          console.log(`[Apollo Enrich] ✅ Email from person data: ${result.email}`)
        } else if (person) {
          console.log('[Apollo Enrich] ⚠️  Person found but no verified email')
        }
      } catch (error) {
        console.error('[Apollo Enrich] ⚠️  Person/Email enrichment failed, continuing with organization data only')
        console.error(JSON.stringify({ error: String(error) }, null, 2))
      }
    }

    result.apollo_enrichment_status = 'enriched'
    console.log('[Apollo Enrich] ✅ enrichCompany completed successfully')
    console.log(
      JSON.stringify(
        {
          apollo_enrichment_status: result.apollo_enrichment_status,
          name: result.name,
          email: result.email || 'N/A',
        },
        null,
        2
      )
    )
    console.log('[Apollo Enrich] 🏢 enrichCompany END\n')

    return result
  } catch (error) {
    result.apollo_enrichment_status = 'failed'
    if (error instanceof ApolloClientError) {
      result.apollo_error_reason = error.message
    } else {
      result.apollo_error_reason = String(error)
    }

    console.error('[Apollo Enrich] ❌ enrichCompany failed')
    console.error(
      JSON.stringify(
        {
          apollo_enrichment_status: result.apollo_enrichment_status,
          apollo_error_reason: result.apollo_error_reason,
        },
        null,
        2
      )
    )
    console.error('[Apollo Enrich] 🏢 enrichCompany END\n')

    return result
  }
}

export async function searchAndEnrichPeople(
  options: SearchAndEnrichOptions
): Promise<EnrichedPersonResult[]> {
  console.log('\n[Apollo Enrich] 🔍 searchAndEnrichPeople START')
  console.log(JSON.stringify(options, null, 2))

  const results: EnrichedPersonResult[] = []
  const maxResults = options.maxResults || 100
  const includeEmail = options.includeEmail !== false

  try {
    const client = createApolloClient()
    let page = 1
    let totalFound = 0

    while (totalFound < maxResults) {
      const perPage = Math.min(25, maxResults - totalFound)
      
      console.log(`[Apollo Enrich] 📄 Searching page ${page} (${perPage} per page)...`)

      const searchResponse = await client.searchPeople({
        person_locations: options.person_locations,
        organization_locations: options.organization_locations,
        q_keywords: options.q_keywords,
        person_titles: options.person_titles,
        page,
        per_page: perPage,
      })

      const people = searchResponse.people || []
      if (people.length === 0) {
        console.log('[Apollo Enrich] ⚠️  No more people found')
        break
      }

      console.log(`[Apollo Enrich] ✅ Found ${people.length} people on page ${page}`)

      for (const person of people) {
        if (totalFound >= maxResults) break

        const enrichedPerson: EnrichedPersonResult = {
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          title: person.title,
          organization_id: person.organization_id,
          organization_name: person.organization_name,
        }

        if (includeEmail && person.id) {
          try {
            console.log(`[Apollo Enrich] 📧 Enriching email for ${enrichedPerson.name}...`)
            const emailResponse = await client.matchEmail({
              id: person.id,
              first_name: person.first_name,
              last_name: person.last_name,
              reveal_personal_emails: options.reveal_personal_emails ?? false,
            })

            if (emailResponse.person?.email) {
              enrichedPerson.email = emailResponse.person.email
              enrichedPerson.email_status = emailResponse.person.email_status
              console.log(`[Apollo Enrich] ✅ Email found: ${enrichedPerson.email} (${enrichedPerson.email_status})`)
            } else {
              console.log(`[Apollo Enrich] ⚠️  No email found for ${enrichedPerson.name}`)
            }
          } catch (error) {
            console.error(`[Apollo Enrich] ⚠️  Email enrichment failed for ${enrichedPerson.name}: ${String(error)}`)
          }
        } else if (person.email) {
          enrichedPerson.email = person.email
          enrichedPerson.email_status = person.email_status
        }

        results.push(enrichedPerson)
        totalFound++
      }

      if (!searchResponse.pagination || 
          !searchResponse.pagination.total_entries || 
          page * perPage >= searchResponse.pagination.total_entries) {
        break
      }

      page++
    }

    console.log(`[Apollo Enrich] ✅ searchAndEnrichPeople completed: ${results.length} people enriched`)
    console.log('[Apollo Enrich] ✅ END searchAndEnrichPeople\n')

    return results
  } catch (error) {
    console.error('[Apollo Enrich] ❌ searchAndEnrichPeople failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END searchAndEnrichPeople\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to search and enrich people: ${String(error)}`)
  }
}

export async function searchOrganizations(
  options: {
    organization_locations?: string[]
    q_keywords?: string
    maxResults?: number
  }
): Promise<ApolloOrganization[]> {
  console.log('\n[Apollo Enrich] 🏢 searchOrganizations START')
  console.log(JSON.stringify(options, null, 2))

  const results: ApolloOrganization[] = []
  const maxResults = options.maxResults || 50

  try {
    const client = createApolloClient()
    let page = 1
    let totalFound = 0

    while (totalFound < maxResults) {
      const perPage = Math.min(25, maxResults - totalFound)

      console.log(`[Apollo Enrich] 📄 Searching organizations page ${page} (${perPage} per page)...`)

      const searchResponse = await client.searchOrganizations({
        organization_locations: options.organization_locations,
        q_organization_keyword_tags: options.q_keywords ? [options.q_keywords] : undefined,
        page,
        per_page: perPage,
      })

      const organizations = searchResponse.organizations || []
      if (organizations.length === 0) {
        console.log('[Apollo Enrich] ⚠️  No more organizations found')
        break
      }

      console.log(`[Apollo Enrich] ✅ Found ${organizations.length} organizations on page ${page}`)

      for (const org of organizations) {
        if (totalFound >= maxResults) break
        results.push(org)
        totalFound++
      }

      if (
        !searchResponse.pagination ||
        !searchResponse.pagination.total_entries ||
        page * perPage >= searchResponse.pagination.total_entries
      ) {
        break
      }

      page++
    }

    console.log(`[Apollo Enrich] ✅ searchOrganizations completed: ${results.length} organizations found`)
    console.log('[Apollo Enrich] ✅ END searchOrganizations\n')

    return results
  } catch (error) {
    console.error('[Apollo Enrich] ❌ searchOrganizations failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END searchOrganizations\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to search organizations: ${String(error)}`)
  }
}

export function exportToCSV(people: EnrichedPersonResult[]): string {
  if (people.length === 0) {
    return ''
  }

  const headers = ['Name', 'First Name', 'Last Name', 'Title', 'Email', 'Email Status', 'Organization Name', 'Location']
  const rows = people.map(person => [
    person.name || '',
    person.first_name || '',
    person.last_name || '',
    person.title || '',
    person.email || '',
    person.email_status || '',
    person.organization_name || '',
    person.location || '',
  ])

  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ]

  return csvRows.join('\n')
}

export function exportToJSON(people: EnrichedPersonResult[]): string {
  return JSON.stringify(people, null, 2)
}

