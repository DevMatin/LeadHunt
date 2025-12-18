import type {
  ApolloApiResponse,
  ApolloError,
  ApolloOrganizationEnrichmentResponse,
  ApolloPersonSearchResponse,
  ApolloPersonSearchParams,
  ApolloEmailMatchResponse,
} from './types'

const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1'
const RATE_LIMIT_REQUESTS_PER_MINUTE = 120
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    )

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 100
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        return this.waitIfNeeded()
      }
    }

    this.requests.push(Date.now())
  }
}

function logRequest(
  endpoint: string,
  method: string,
  statusCode?: number,
  error?: string,
  requestBody?: unknown,
  responseBody?: unknown,
  url?: string
): void {
  const timestamp = new Date().toISOString()
  
  const logData: Record<string, unknown> = {
    timestamp,
    service: 'apollo',
    endpoint,
    method,
    url: url || endpoint,
  }

  if (requestBody) {
    logData.requestBody = requestBody
  }

  if (statusCode) {
    logData.statusCode = statusCode
  }

  if (responseBody) {
    logData.responseBody = responseBody
  }

  if (error) {
    logData.error = error
  }

  const logMessage = JSON.stringify(logData, null, 2)
  
  if (error || (statusCode && statusCode >= 400)) {
    console.error('\n[Apollo Client] ❌ ERROR')
    console.error(logMessage)
    console.error('[Apollo Client] ❌ END ERROR\n')
  } else {
    console.log('\n[Apollo Client] ✅ REQUEST')
    console.log(logMessage)
    console.log('[Apollo Client] ✅ END REQUEST\n')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error: ApolloClientError): boolean {
  if (!error.statusCode) return true

  return (
    error.statusCode >= 500 ||
    error.statusCode === 429 ||
    error.code === 'rate_limit_exceeded'
  )
}

export class ApolloClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'ApolloClientError'
  }
}

export class ApolloClient {
  private apiKey: string
  private baseUrl: string
  private rateLimiter: RateLimiter

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Apollo API key is required')
    }
    this.apiKey = apiKey
    this.baseUrl = APOLLO_BASE_URL
    this.rateLimiter = new RateLimiter(
      RATE_LIMIT_REQUESTS_PER_MINUTE,
      60 * 1000
    )
  }

  private async request<T>(
    endpoint: string,
    options: Omit<RequestInit, 'body'> & { body?: Record<string, unknown> } = {},
    retryCount = 0
  ): Promise<T> {
    await this.rateLimiter.waitIfNeeded()

    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || 'GET'

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'accept': 'application/json',
      'X-Api-Key': this.apiKey,
      ...options.headers,
    }

    const requestBody = options.body
    const safeHeaders = { ...headers }
    if ('X-Api-Key' in safeHeaders) {
      safeHeaders['X-Api-Key'] = '***MASKED***'
    }

    if (retryCount === 0) {
      logRequest(
        endpoint,
        method,
        undefined,
        undefined,
        requestBody,
        undefined,
        url
      )
    } else {
      console.log(
        `[Apollo Client] 🔄 Retry ${retryCount}/${MAX_RETRIES} for ${endpoint}`
      )
    }

    const { body, ...fetchOptions } = options

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      let responseData: unknown = null
      try {
        responseData = await response.json()
      } catch {
        responseData = await response.text()
      }

      if (!response.ok) {
        let errorData: ApolloError | null = null
        try {
          if (typeof responseData === 'object' && responseData !== null) {
            errorData = responseData as ApolloError
          }
        } catch {
          // Ignore JSON parse errors
        }

        const error = new ApolloClientError(
          errorData?.message || errorData?.error || `HTTP ${response.status}`,
          response.status,
          errorData?.code,
          errorData || responseData
        )

        logRequest(
          endpoint,
          method,
          response.status,
          error.message,
          requestBody,
          responseData,
          url
        )

        if (
          isRetryableError(error) &&
          retryCount < MAX_RETRIES
        ) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount)
          console.log(
            `[Apollo Client] ⏳ Waiting ${delay}ms before retry...`
          )
          await sleep(delay)
          return this.request<T>(endpoint, options, retryCount + 1)
        }

        throw error
      }

      const data = responseData as ApolloApiResponse<T> | T

      if (
        typeof data === 'object' &&
        data !== null &&
        'error' in (data as Record<string, unknown>) &&
        (data as ApolloApiResponse<T>).error
      ) {
        const errorData = data as ApolloApiResponse<T>
        const error = new ApolloClientError(
          errorData.error?.message || errorData.error?.error || 'Apollo API error',
          undefined,
          errorData.error?.code,
          errorData.error
        )

        logRequest(
          endpoint,
          method,
          undefined,
          error.message,
          requestBody,
          data,
          url
        )

        if (
          isRetryableError(error) &&
          retryCount < MAX_RETRIES
        ) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount)
          console.log(
            `[Apollo Client] ⏳ Waiting ${delay}ms before retry...`
          )
          await sleep(delay)
          return this.request<T>(endpoint, options, retryCount + 1)
        }

        throw error
      }

      logRequest(
        endpoint,
        method,
        response.status,
        undefined,
        requestBody,
        data,
        url
      )

      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data
      ) {
        return (data as ApolloApiResponse<T>).data as T
      }

      return data as T
    } catch (error) {
      if (error instanceof ApolloClientError) {
        throw error
      }

      const networkError = new ApolloClientError(
        `Network error: ${String(error)}`,
        undefined,
        'network_error',
        error
      )

      logRequest(
        endpoint,
        method,
        undefined,
        networkError.message,
        requestBody,
        undefined,
        url
      )

      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.log(
          `[Apollo Client] ⏳ Waiting ${delay}ms before retry...`
        )
        await sleep(delay)
        return this.request<T>(endpoint, options, retryCount + 1)
      }

      throw networkError
    }
  }

  async enrichOrganization(params: {
    domain: string
  }): Promise<ApolloOrganizationEnrichmentResponse> {
    if (!params.domain) {
      throw new Error('Domain is required for organization enrichment')
    }

    const queryParams = new URLSearchParams()
    queryParams.set('domain', params.domain)

    return this.request<ApolloOrganizationEnrichmentResponse>(
      `/organizations/enrich?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    )
  }

  async searchPeople(params: ApolloPersonSearchParams): Promise<ApolloPersonSearchResponse> {
    const body: Record<string, unknown> = {
      page: params.page || 1,
      per_page: params.per_page || 25,
    }

    if (params.organization_id) {
      body.organization_id = params.organization_id
    } else if (params.organization_name) {
      body.organization_name = params.organization_name
    }

    if (params.person_titles && params.person_titles.length > 0) {
      body.person_titles = params.person_titles
    }

    if (params.person_locations && params.person_locations.length > 0) {
      body.person_locations = params.person_locations
    }

    if (params.organization_locations && params.organization_locations.length > 0) {
      body.organization_locations = params.organization_locations
    }

    if (params.q_keywords) {
      body.q_keywords = params.q_keywords
    }

    if (!params.organization_id && !params.organization_name && 
        !params.person_locations && !params.organization_locations && 
        !params.q_keywords) {
      throw new Error('At least one search parameter must be provided (organization_id, organization_name, person_locations, organization_locations, or q_keywords)')
    }

    return this.request<ApolloPersonSearchResponse>(
      '/mixed_people/api_search',
      {
        method: 'POST',
        body,
      }
    )
  }

  async matchEmail(params: {
    id?: string
    first_name?: string
    last_name?: string
    domain?: string
    reveal_personal_emails?: boolean
  }): Promise<ApolloEmailMatchResponse> {
    const body: Record<string, string | boolean> = {
      reveal_personal_emails: params.reveal_personal_emails ?? true,
    }

    if (params.id) {
      body.id = params.id
    } else if (params.first_name && params.last_name && params.domain) {
      body.first_name = params.first_name
      body.last_name = params.last_name
      body.domain = params.domain
    } else {
      throw new Error(
        'Either id or first_name+last_name+domain must be provided'
      )
    }

    return this.request<ApolloEmailMatchResponse>('/people/match', {
      method: 'POST',
      body,
    })
  }

  async searchOrganizations(
    params: ApolloOrganizationSearchParams
  ): Promise<ApolloOrganizationSearchResponse> {
    const body: Record<string, unknown> = {
      page: params.page || 1,
      per_page: params.per_page || 25,
    }

    if (params.organization_locations && params.organization_locations.length > 0) {
      body.organization_locations = params.organization_locations
    }

    if (params.q_organization_keyword_tags && params.q_organization_keyword_tags.length > 0) {
      body.q_organization_keyword_tags = params.q_organization_keyword_tags
    }

    if (params.q_organization_name) {
      body.q_organization_name = params.q_organization_name
    }

    if (
      !params.organization_locations &&
      !params.q_organization_keyword_tags &&
      !params.q_organization_name
    ) {
      throw new Error(
        'At least one search parameter must be provided (organization_locations, q_organization_keyword_tags, or q_organization_name)'
      )
    }

    return this.request<ApolloOrganizationSearchResponse>(
      '/mixed_companies/search',
      {
        method: 'POST',
        body,
      }
    )
  }
}

export function createApolloClient(): ApolloClient {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY environment variable is not set')
  }
  
  // Debug: Log API Key info (first 10 chars only for security)
  const apiKeyPreview = apiKey.length > 10 ? `${apiKey.substring(0, 10)}...` : apiKey
  console.log(`[Apollo Client] 🔑 Using API Key: ${apiKeyPreview} (length: ${apiKey.length})`)
  
  return new ApolloClient(apiKey)
}

