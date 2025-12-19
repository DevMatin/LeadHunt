export type ApolloEnrichmentStatus = 'pending' | 'enriched' | 'failed' | 'skipped'

export interface ApolloOrganization {
  id?: string
  name?: string
  website_url?: string
  primary_phone?: {
    number?: string
    source?: string
  }
  phone?: string
  sanitized_phone?: string
  industry?: string
  industries?: string[]
  estimated_num_employees?: number
  raw_address?: string
  street_address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  primary_domain?: string
  linkedin_url?: string
  description?: string
  founded_year?: number
  [key: string]: unknown
}

export interface ApolloPerson {
  id?: string
  first_name?: string
  last_name?: string
  name?: string
  title?: string
  email?: string
  email_status?: string
  organization_id?: string
  organization_name?: string
  [key: string]: unknown
}

export interface ApolloEmailMatch {
  email?: string
  email_status?: string
  first_name?: string
  last_name?: string
  [key: string]: unknown
}

export interface ApolloOrganizationEnrichmentResponse {
  organization?: ApolloOrganization
  [key: string]: unknown
}

export interface ApolloPersonSearchParams {
  organization_id?: string
  organization_name?: string
  person_titles?: string[]
  person_locations?: string[]
  organization_locations?: string[]
  q_keywords?: string
  page?: number
  per_page?: number
}

export interface ApolloPersonSearchResponse {
  people?: ApolloPerson[]
  pagination?: {
    page?: number
    per_page?: number
    total_entries?: number
  }
  [key: string]: unknown
}

export interface ApolloEmailMatchResponse {
  person?: ApolloEmailMatch
  [key: string]: unknown
}

export interface ApolloError {
  error?: string
  message?: string
  code?: string
  [key: string]: unknown
}

export interface ApolloApiResponse<T> {
  data?: T
  error?: ApolloError
  [key: string]: unknown
}

export interface EnrichedPersonResult {
  id?: string
  first_name?: string
  last_name?: string
  name?: string
  title?: string
  email?: string
  email_status?: string
  organization_id?: string
  organization_name?: string
  location?: string
  [key: string]: unknown
}

export interface SearchAndEnrichOptions {
  person_locations?: string[]
  organization_locations?: string[]
  q_keywords?: string
  person_titles?: string[]
  maxResults?: number
  includeEmail?: boolean
  reveal_personal_emails?: boolean
}

export interface ApolloOrganizationSearchParams {
  organization_locations?: string[]
  q_organization_keyword_tags?: string[]
  q_organization_name?: string
  page?: number
  per_page?: number
}

export interface ApolloOrganizationSearchResponse {
  organizations?: ApolloOrganization[]
  pagination?: {
    page?: number
    per_page?: number
    total_entries?: number
  }
  [key: string]: unknown
}

export type MatchQuality = 'exact' | 'mismatch' | 'unknown'

export interface EnrichRequest {
  companyName: string
  email: string
}

export interface EnrichResponse {
  person: {
    name?: string
    title?: string
    apolloId?: string
  } | null
  organization: {
    name?: string
    domain?: string
  } | null
  matchQuality: MatchQuality
}
