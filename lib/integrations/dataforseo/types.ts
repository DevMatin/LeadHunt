export type DataForSEOEnrichmentStatus = 'pending' | 'enriched' | 'failed' | 'skipped'

export interface DataForSEOOrganization {
  id?: string
  name?: string
  website_url?: string
  domain?: string
  phone?: string
  industry?: string
  location?: string
  description?: string
  email?: string
  full_data?: Record<string, unknown>
  [key: string]: unknown
}

export interface DataForSEOPerson {
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

export interface DataForSEOOrganizationSearchParams {
  location?: string
  location_coordinate?: string
  industry?: string
  keyword?: string
  category?: string
  page?: number
  per_page?: number
}

export interface DataForSEOOrganizationSearchResponse {
  organizations?: DataForSEOOrganization[]
  pagination?: {
    page?: number
    per_page?: number
    total_entries?: number
  }
  [key: string]: unknown
}

export interface DataForSEOError {
  error?: string
  message?: string
  code?: string
  [key: string]: unknown
}

export interface DataForSEOApiResponse<T> {
  data?: T
  error?: DataForSEOError
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
  location?: string
  industry?: string
  keyword?: string
  maxResults?: number
  includeEmail?: boolean
}

export type MatchQuality = 'exact' | 'mismatch' | 'unknown'

export type EmailQuality = 
  | 'verified_business'
  | 'unverified_business'
  | 'verified_personal'
  | 'unverified_personal'
