import { createApolloClient, ApolloClientError } from './client'
import type {
  ApolloOrganization,
  ApolloPerson,
  ApolloEnrichmentStatus,
  EnrichedPersonResult,
  SearchAndEnrichOptions,
  EnrichRequest,
  EnrichResponse,
  MatchQuality,
} from './types'
import { matchCompanyName } from './matchCompany'

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
  owner_first_name?: string
  owner_last_name?: string
  owner_email?: string
  owner_title?: string
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

export async function findCompanyOwnerByName(
  companyName: string,
  includeEmail: boolean = true,
  titles?: string[],
  expectedOrganizationId?: string
): Promise<ApolloPerson | null> {
  console.log('\n[Apollo Enrich] 👔 findCompanyOwnerByName')
  console.log(
    JSON.stringify(
      {
        companyName,
        includeEmail,
        titles: titles || [
          'CEO',
          'Chief Executive Officer',
          'Founder',
          'Co-Founder',
          'President',
          'Owner',
          'Geschäftsführer',
          'Managing Director',
          'Inhaber',
          'Proprietor',
          'Geschäftsinhaber',
        ],
      },
      null,
      2
    )
  )

  if (!companyName) {
    console.log('[Apollo Enrich] ⚠️  Skipped: Missing company name')
    return null
  }

  try {
    const client = createApolloClient()
    const defaultTitles = titles || [
      'CEO',
      'Chief Executive Officer',
      'Founder',
      'Co-Founder',
      'President',
      'Owner',
      'Geschäftsführer',
      'Managing Director',
      'Inhaber',
      'Proprietor',
      'Geschäftsinhaber',
    ]

    const response = await client.searchPeople({
      organization_name: companyName,
      person_titles: defaultTitles,
      page: 1,
      per_page: 1,
    })

    if (!response.people || response.people.length === 0) {
      console.log('[Apollo Enrich] ⚠️  No owner found')
      console.log('[Apollo Enrich] ✅ END findCompanyOwnerByName\n')
      return null
    }

    const person = response.people[0]
    
    const personOrgId = person.organization_id || (person as any).organization?.id
    const personOrgName = person.organization_name || (person as any).organization?.name
    
    const orgMatches = 
      (expectedOrganizationId && personOrgId === expectedOrganizationId) ||
      (!expectedOrganizationId && personOrgName && personOrgName.toLowerCase() === companyName.toLowerCase())
    
    if (!orgMatches) {
      console.log(`[Apollo Enrich] ⚠️  Person belongs to different organization`)
      console.log(`[Apollo Enrich]   - Searched for: ${companyName}${expectedOrganizationId ? ` (ID: ${expectedOrganizationId})` : ''}`)
      console.log(`[Apollo Enrich]   - Person belongs to: ${personOrgName || 'N/A'} (ID: ${personOrgId || 'N/A'})`)
      console.log('[Apollo Enrich] ✅ END findCompanyOwnerByName\n')
      return null
    }
    
    console.log('[Apollo Enrich] ✅ Owner found')
    console.log(
      JSON.stringify(
        {
          id: person.id,
          name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          title: person.title,
          email: person.email,
          emailStatus: person.email_status,
          organization_name: person.organization_name,
        },
        null,
        2
      )
    )

    if (includeEmail && person.id && !person.email) {
      console.log('[Apollo Enrich] 🔍 Fetching email for owner...')
      try {
        const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
        const emailResponse = await client.matchEmail({
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          reveal_personal_emails: false,
        })

        if (emailResponse.person?.email) {
          person.email = emailResponse.person.email
          person.email_status = emailResponse.person.email_status
          console.log(`[Apollo Enrich] ✅ Email found: ${person.email}`)
        }
      } catch (emailError) {
        console.error('[Apollo Enrich] ⚠️  Email lookup failed')
        console.error(JSON.stringify({ error: String(emailError) }, null, 2))
      }
    } else if (person.email) {
      console.log(`[Apollo Enrich] ✅ Email already available: ${person.email}`)
    }

    console.log('[Apollo Enrich] ✅ END findCompanyOwnerByName\n')
    return person
  } catch (error) {
    console.error('[Apollo Enrich] ❌ findCompanyOwnerByName failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END findCompanyOwnerByName\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to find company owner: ${String(error)}`)
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

  const includePerson = options.includePerson !== false
  const includeEmail = options.includeEmail !== false

  try {
    let domain = website
      ? website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : undefined

    let organization: ApolloOrganization | null = null

    if (domain) {
      console.log(`[Apollo Enrich] 🔍 Extracted domain: ${domain}`)
      organization = await enrichOrganization(domain)
    }

    if (!organization && name) {
      console.log('[Apollo Enrich] 🔍 Trying to find organization by name...')
      try {
        const client = createApolloClient()
        const searchResponse = await client.searchOrganizations({
          q_organization_name: name,
          page: 1,
          per_page: 1,
        })

        if (searchResponse.organizations && searchResponse.organizations.length > 0) {
          organization = searchResponse.organizations[0]
          domain = organization.primary_domain || organization.website_url?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
          console.log(`[Apollo Enrich] ✅ Organization found by name, domain: ${domain || 'N/A'}`)
        }
      } catch (error) {
        console.error('[Apollo Enrich] ⚠️  Organization search by name failed')
        console.error(JSON.stringify({ error: String(error) }, null, 2))
      }
    }

    if (!organization) {
      result.apollo_enrichment_status = 'failed'
      result.apollo_error_reason = 'Organization not found in Apollo'
      console.log('[Apollo Enrich] ❌ Organization not found')
      console.log('[Apollo Enrich] 🏢 enrichCompany END\n')
      return result
    }

    result.name = organization.name || name
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
          industry: result.industry,
          location: result.location,
          apollo_organization_id: result.apollo_organization_id,
        },
        null,
        2
      )
    )

    if (includePerson) {
      console.log('[Apollo Enrich] 🔍 Starting person/email enrichment...')
      try {
        let person: ApolloPerson | null = null

        if (organization.id) {
          person = await findTopDecisionMaker(
            organization.id,
            organization.name,
            options.personTitles
          )
        }

        if (!person && organization.name) {
          console.log('[Apollo Enrich] 🔍 Trying to find owner by company name...')
          person = await findCompanyOwnerByName(
            organization.name,
            includeEmail,
            options.personTitles,
            organization.id
          )
        }

        if (!person && organization.id && includeEmail) {
          console.log('[Apollo Enrich] 🔍 Trying to find any person with email in organization...')
          try {
            const client = createApolloClient()
            const searchResponse = await client.searchPeople({
              organization_id: organization.id,
              page: 1,
              per_page: 10,
            })

            if (searchResponse.people && searchResponse.people.length > 0) {
              for (const candidate of searchResponse.people) {
                if (candidate.email && candidate.email_status === 'verified') {
                  person = candidate
                  console.log(`[Apollo Enrich] ✅ Found person with verified email: ${candidate.email}`)
                  break
                }
              }

              if (!person && searchResponse.people.length > 0) {
                const candidate = searchResponse.people[0]
                if (candidate.id) {
                  console.log('[Apollo Enrich] 🔍 Trying to get email for first person found...')
                  try {
                    const emailResponse = await client.matchEmail({
                      id: candidate.id,
                      first_name: candidate.first_name,
                      last_name: candidate.last_name,
                      reveal_personal_emails: false,
                    })

                    if (emailResponse.person?.email) {
                      candidate.email = emailResponse.person.email
                      candidate.email_status = emailResponse.person.email_status
                      person = candidate
                      console.log(`[Apollo Enrich] ✅ Email found: ${person.email}`)
                    }
                  } catch (emailError) {
                    console.error('[Apollo Enrich] ⚠️  Email lookup failed')
                  }
                }
              }
            }
          } catch (error) {
            console.error('[Apollo Enrich] ⚠️  Person search failed')
            console.error(JSON.stringify({ error: String(error) }, null, 2))
          }
        }

        if (person) {
          result.owner_first_name = person.first_name || undefined
          result.owner_last_name = person.last_name || undefined
          result.owner_title = person.title || undefined

          if (includeEmail) {
            if (person.email && person.email_status === 'verified') {
              result.owner_email = person.email
              result.email = person.email
              console.log(`[Apollo Enrich] ✅ Owner email found: ${person.email}`)
            } else if (person.id) {
              console.log('[Apollo Enrich] 🔍 Starting email lookup...')
              const email = await findEmail(
                person.id,
                person.first_name,
                person.last_name,
                domain
              )
              if (email) {
                result.owner_email = email
                result.email = email
                console.log(`[Apollo Enrich] ✅ Email found: ${email}`)
              }
            }
          } else if (person.email) {
            result.owner_email = person.email
            if (!result.email) {
              result.email = person.email
            }
            console.log(`[Apollo Enrich] ✅ Owner email from person data: ${result.owner_email}`)
          }

          console.log('[Apollo Enrich] ✅ Owner data enriched')
          console.log(
            JSON.stringify(
              {
                owner_first_name: result.owner_first_name,
                owner_last_name: result.owner_last_name,
                owner_title: result.owner_title,
                owner_email: result.owner_email,
              },
              null,
              2
            )
          )
        } else {
          console.log('[Apollo Enrich] ⚠️  No person found')
        }
      } catch (error) {
        console.error('[Apollo Enrich] ⚠️  Owner/Person enrichment failed')
        console.error(JSON.stringify({ error: String(error) }, null, 2))
      }
    }

    if (includeEmail && !result.email && !result.owner_email) {
      result.apollo_enrichment_status = 'failed'
      result.apollo_error_reason = 'Email is required but could not be found'
      console.log('[Apollo Enrich] ❌ Email required but not found')
      console.log('[Apollo Enrich] 🏢 enrichCompany END\n')
      return result
    }

    result.apollo_enrichment_status = 'enriched'
    console.log('[Apollo Enrich] ✅ enrichCompany completed successfully')
    console.log(
      JSON.stringify(
        {
          apollo_enrichment_status: result.apollo_enrichment_status,
          name: result.name,
          email: result.email || result.owner_email || 'N/A',
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

export interface PeopleWithVerifiedEmailsResult {
  organization_id: string
  organization_name?: string
  organization?: {
    name: string
  }
  people: ApolloPerson[]
}

export interface SearchPeopleWithVerifiedEmailsOptions {
  location: string
  industry?: string
  titles?: string[]
  maxResults?: number
}

export async function searchPeopleWithVerifiedEmails(
  options: SearchPeopleWithVerifiedEmailsOptions
): Promise<Map<string, PeopleWithVerifiedEmailsResult>> {
  console.log('\n[Apollo Enrich] 🔍 searchPeopleWithVerifiedEmails START')
  console.log(JSON.stringify(options, null, 2))

  const results = new Map<string, PeopleWithVerifiedEmailsResult>()
  const maxResults = options.maxResults || 100

  try {
    const client = createApolloClient()
    let page = 1
    let totalFound = 0
    let totalFiltered = 0

    while (totalFound < maxResults) {
      const perPage = Math.min(25, maxResults - totalFound)

      console.log(`[Apollo Enrich] 📄 Searching people page ${page} (${perPage} per page)...`)

      const searchParams: {
        person_locations?: string[]
        person_titles?: string[]
        q_keywords?: string
        page: number
        per_page: number
      } = {
        person_locations: [options.location],
        page,
        per_page: perPage,
      }

      if (options.titles && options.titles.length > 0) {
        searchParams.person_titles = options.titles
      }

      if (options.industry) {
        searchParams.q_keywords = options.industry
      }

      const searchResponse = await client.searchPeople(searchParams)

      const people = searchResponse.people || []
      if (people.length === 0) {
        console.log('[Apollo Enrich] ⚠️  No more people found')
        break
      }

      console.log(`[Apollo Enrich] ✅ Found ${people.length} people on page ${page}`)

      for (const person of people) {
        if (totalFound >= maxResults) break

        totalFiltered++

        if (!person.organization?.name) {
          console.log(`[Apollo Enrich] ⚠️  Skipping person without organization name`)
          continue
        }

        let personEmail = person.email
        let personEmailStatus = person.email_status

        if (!personEmail && person.id) {
          try {
            console.log(`[Apollo Enrich] 🔍 Fetching email for person ${person.id}...`)
            const emailResponse = await client.matchEmail({
              id: person.id,
              first_name: person.first_name,
              last_name: person.last_name,
              reveal_personal_emails: false,
            })
            if (emailResponse.person?.email) {
              personEmail = emailResponse.person.email
              personEmailStatus = emailResponse.person.email_status
            }
          } catch (emailError) {
            console.log(`[Apollo Enrich] ⚠️  Email lookup failed for person ${person.id}: ${String(emailError)}`)
          }
        }

        if (!personEmail) {
          console.log(`[Apollo Enrich] ⚠️  Skipping person without email: ${person.first_name} ${person.last_name}`)
          continue
        }

        if (personEmailStatus !== 'verified') {
          console.log(`[Apollo Enrich] ⚠️  Skipping person with non-verified email: ${personEmail} (status: ${personEmailStatus})`)
          continue
        }

        if (!isBusinessEmail(personEmail)) {
          console.log(`[Apollo Enrich] ⚠️  Skipping person with personal email: ${personEmail}`)
          continue
        }

        person.email = personEmail
        person.email_status = personEmailStatus

        const orgKey = person.organization.name.trim().toLowerCase()
        if (!results.has(orgKey)) {
          results.set(orgKey, {
            organization_id: (person as any).organization_id || person.organization?.id || '',
            organization_name: person.organization.name,
            organization: {
              name: person.organization.name
            },
            people: [],
          })
        }

        const orgGroup = results.get(orgKey)!
        orgGroup.people.push(person)
        totalFound++

        console.log(`[Apollo Enrich] ✅ Added person: ${person.first_name} ${person.last_name} (${person.email}) to org ${orgKey}`)
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

    console.log(`[Apollo Enrich] ✅ searchPeopleWithVerifiedEmails completed:`)
    console.log(`[Apollo Enrich]   - Total people processed: ${totalFiltered}`)
    console.log(`[Apollo Enrich]   - People with verified business emails: ${totalFound}`)
    console.log(`[Apollo Enrich]   - Organizations grouped: ${results.size}`)
    console.log('[Apollo Enrich] ✅ END searchPeopleWithVerifiedEmails\n')

    return results
  } catch (error) {
    console.error('[Apollo Enrich] ❌ searchPeopleWithVerifiedEmails failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END searchPeopleWithVerifiedEmails\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to search people with verified emails: ${String(error)}`)
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

function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([^@]+)$/)
  if (!match || !match[1]) {
    return null
  }
  return match[1].toLowerCase().trim()
}

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'gmx.de',
  'web.de',
  'mail.com',
  'protonmail.com',
  'yandex.com',
  'zoho.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
])

export function isBusinessEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const domain = extractDomainFromEmail(email.toLowerCase())
  if (!domain) {
    return false
  }
  
  return !PERSONAL_EMAIL_DOMAINS.has(domain)
}

export function extractOrganizationFromPerson(person: ApolloPerson | ApolloEmailMatch): {
  name: string | null
  id: string | null
} {
  const personOrg = (person as any).organization
  const employmentHistory = (person as any).employment_history
  
  if (personOrg?.name) {
    return { name: personOrg.name, id: personOrg.id || null }
  }
  if (employmentHistory && Array.isArray(employmentHistory) && employmentHistory.length > 0) {
    const org = employmentHistory[0]?.organization
    return { name: org?.name || null, id: org?.id || null }
  }
  if ((person as ApolloPerson).organization_name) {
    return { 
      name: (person as ApolloPerson).organization_name || null, 
      id: (person as ApolloPerson).organization_id || null 
    }
  }
  return { name: null, id: null }
}

export async function enrichPersonByEmailAndCompany(
  request: EnrichRequest
): Promise<EnrichResponse & { raw?: unknown }> {
  console.log('\n[Apollo Enrich] 📧 enrichPersonByEmailAndCompany START')
  console.log(JSON.stringify({ email: request.email, companyName: request.companyName }, null, 2))

  const result: EnrichResponse & { raw?: unknown } = {
    person: null,
    organization: null,
    matchQuality: 'unknown',
  }

  try {
    const domain = extractDomainFromEmail(request.email)
    if (!domain) {
      console.log('[Apollo Enrich] ⚠️  Could not extract domain from email')
      console.log('[Apollo Enrich] ✅ END enrichPersonByEmailAndCompany\n')
      return result
    }

    console.log(`[Apollo Enrich] 🔍 Extracted domain: ${domain}`)

    const client = createApolloClient()
    
    let organization: ApolloOrganization | null = null
    let person: ApolloPerson | null = null
    let rawResponse: unknown = null
    let emailMatchFound = false

    try {
      const orgResponse = await client.enrichOrganization({ domain })
      organization = orgResponse.organization || null
      
      if (organization) {
        console.log(`[Apollo Enrich] ✅ Organization found: ${organization.name}`)
      } else {
        console.log('[Apollo Enrich] ⚠️  No organization found for domain')
      }
    } catch (error) {
      console.error('[Apollo Enrich] ⚠️  Organization enrichment failed')
      console.error(JSON.stringify({ error: String(error) }, null, 2))
    }

    if (organization?.id) {
      try {
        console.log(`[Apollo Enrich] 🔍 Searching people in organization: ${organization.id}`)
        const peopleResponse = await client.searchPeople({
          organization_id: organization.id,
          page: 1,
          per_page: 50,
        })

        rawResponse = peopleResponse

        const people = peopleResponse.people || []
        console.log(`[Apollo Enrich] ✅ Found ${people.length} people in organization`)

        person = people.find((p) => {
          const personEmail = p.email?.toLowerCase().trim()
          const searchEmail = request.email.toLowerCase().trim()
          return personEmail === searchEmail
        }) || null

        if (person && person.id) {
          console.log(`[Apollo Enrich] ✅ Person found with matching email: ${person.email}`)
          
          try {
            const emailResponse = await client.matchEmail({
              id: person.id,
              reveal_personal_emails: false,
            })

            if (emailResponse.person) {
              emailMatchFound = true
              const extractedOrg = extractOrganizationFromPerson(emailResponse.person)
              const matchQuality = matchCompanyName(request.companyName, extractedOrg.name)
              
              result.person = {
                name: emailResponse.person.first_name && emailResponse.person.last_name
                  ? `${emailResponse.person.first_name} ${emailResponse.person.last_name}`.trim()
                  : person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || undefined,
                title: person.title || undefined,
                apolloId: person.id || undefined,
              }
              
              if (extractedOrg.name) {
                result.organization = {
                  name: extractedOrg.name,
                  domain: organization?.primary_domain || domain || undefined,
                }
              } else if (organization) {
                result.organization = {
                  name: organization.name || undefined,
                  domain: organization.primary_domain || domain || undefined,
                }
              }
              
              result.matchQuality = matchQuality
              
              if (matchQuality === 'mismatch') {
                console.log(
                  `[Apollo Enrich] ✅ Email match found - Match quality: mismatch - Input: "${request.companyName}" vs Apollo: "${extractedOrg.name || 'unknown'}"`
                )
              } else if (matchQuality === 'exact') {
                console.log(
                  `[Apollo Enrich] ✅ Email match found - Match quality: exact - "${request.companyName}"`
                )
              } else {
                console.log(
                  `[Apollo Enrich] ✅ Email match found - Match quality: unknown`
                )
              }

              result.raw = {
                organization,
                person: emailResponse.person,
                rawResponse,
              }

              console.log('[Apollo Enrich] ✅ END enrichPersonByEmailAndCompany\n')
              return result
            }
          } catch (emailError) {
            console.error('[Apollo Enrich] ⚠️  Email match failed, continuing with person data')
            console.error(JSON.stringify({ error: String(emailError) }, null, 2))
          }
        } else {
          console.log('[Apollo Enrich] ⚠️  No person found with matching email in search results')
        }
      } catch (error) {
        console.error('[Apollo Enrich] ⚠️  People search failed')
        console.error(JSON.stringify({ error: String(error) }, null, 2))
      }
    }

    if (!emailMatchFound) {
      let apolloOrganizationName: string | null | undefined = null

      if (person) {
        const personOrg = (person as any).organization
        const employmentHistory = (person as any).employment_history

        if (personOrg?.name) {
          apolloOrganizationName = personOrg.name
        } else if (employmentHistory && Array.isArray(employmentHistory) && employmentHistory.length > 0) {
          apolloOrganizationName = employmentHistory[0]?.organization?.name
        } else if (person.organization_name) {
          apolloOrganizationName = person.organization_name
        } else if (organization?.name) {
          apolloOrganizationName = organization.name
        }

        result.person = {
          name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || undefined,
          title: person.title || undefined,
          apolloId: person.id || undefined,
        }
      } else if (organization) {
        apolloOrganizationName = organization.name
      }

      if (organization) {
        result.organization = {
          name: organization.name || undefined,
          domain: organization.primary_domain || domain || undefined,
        }
      }

      const matchQuality = matchCompanyName(request.companyName, apolloOrganizationName)
      result.matchQuality = matchQuality

      if (matchQuality === 'mismatch') {
        console.warn(
          `[Apollo Enrich] ⚠️  Match quality: mismatch - Input: "${request.companyName}" vs Apollo: "${apolloOrganizationName}"`
        )
      } else if (matchQuality === 'unknown') {
        console.log(
          `[Apollo Enrich] ⚠️  Match quality: unknown - No organization found for company: "${request.companyName}"`
        )
      }

      result.raw = {
        organization,
        person,
        rawResponse,
      }
    }

    console.log('[Apollo Enrich] ✅ END enrichPersonByEmailAndCompany\n')
    return result
  } catch (error) {
    console.error('[Apollo Enrich] ❌ enrichPersonByEmailAndCompany failed')
    console.error(JSON.stringify({ error: String(error) }, null, 2))
    console.error('[Apollo Enrich] ❌ END enrichPersonByEmailAndCompany\n')

    if (error instanceof ApolloClientError) {
      throw error
    }
    throw new Error(`Failed to enrich person by email and company: ${String(error)}`)
  }
}

