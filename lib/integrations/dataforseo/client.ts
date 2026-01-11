import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import type {
  DataForSEOApiResponse,
  DataForSEOError,
  DataForSEOOrganizationSearchParams,
  DataForSEOOrganizationSearchResponse,
} from './types'

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3'
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

const DATAFORSEO_VERBOSE_LOGGING = process.env.DATAFORSEO_VERBOSE_LOGGING === 'true'

function logRequest(
  endpoint: string,
  method: string,
  statusCode?: number,
  error?: string,
  requestBody?: unknown,
  responseBody?: unknown,
  url?: string
): void {
  const hasError = error || (statusCode && statusCode >= 400)
  
  if (!DATAFORSEO_VERBOSE_LOGGING && !hasError) {
    return
  }

  const timestamp = new Date().toISOString()
  
  const logData: Record<string, unknown> = {
    timestamp,
    service: 'dataforseo',
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

  if (responseBody && DATAFORSEO_VERBOSE_LOGGING) {
    logData.responseBody = responseBody
  }

  if (error) {
    logData.error = error
  }

  const logMessage = JSON.stringify(logData, null, 2)
  
  if (hasError) {
    console.error('\n[DataForSEO Client] ❌ ERROR')
    console.error(logMessage)
    console.error('[DataForSEO Client] ❌ END ERROR\n')
  } else if (DATAFORSEO_VERBOSE_LOGGING) {
    console.log('\n[DataForSEO Client] ✅ REQUEST')
    console.log(logMessage)
    console.log('[DataForSEO Client] ✅ END REQUEST\n')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error: DataForSEOClientError): boolean {
  if (!error.statusCode) return true

  return (
    error.statusCode >= 500 ||
    error.statusCode === 429 ||
    error.code === 'rate_limit_exceeded'
  )
}

export class DataForSEOClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'DataForSEOClientError'
  }
}

export class DataForSEOClient {
  private login: string
  private password: string
  private baseUrl: string
  private rateLimiter: RateLimiter

  constructor(login: string, password: string) {
    if (!login || !password) {
      throw new Error('DataForSEO login and password are required')
    }
    this.login = login
    this.password = password
    this.baseUrl = DATAFORSEO_BASE_URL
    this.rateLimiter = new RateLimiter(
      RATE_LIMIT_REQUESTS_PER_MINUTE,
      60 * 1000
    )
  }

  async getSupportedLocations(countryCode?: string): Promise<Array<{ location_name: string; country_iso_code: string; business_count: number }>> {
    try {
      const endpoint = countryCode 
        ? `/business_data/business_listings/locations/${countryCode}`
        : '/business_data/business_listings/locations'
      
      const response = await this.request<{
        tasks?: Array<{
          result?: Array<{
            location_name?: string
            country_iso_code?: string
            business_count?: number
          }>
        }>
      }>(
        endpoint,
        {
          method: 'GET',
        }
      )

      const locations: Array<{ location_name: string; country_iso_code: string; business_count: number }> = []
      
      if (response.tasks && response.tasks.length > 0) {
        for (const task of response.tasks) {
          if (task.result && task.result.length > 0) {
            for (const location of task.result) {
              if (location.location_name && location.country_iso_code) {
                locations.push({
                  location_name: location.location_name,
                  country_iso_code: location.country_iso_code,
                  business_count: location.business_count || 0,
                })
              }
            }
          }
        }
      }

      return locations
    } catch (error) {
      console.error('[DataForSEO Client] ⚠️  Failed to get supported locations')
      return []
    }
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: Record<string, unknown>; headers?: Record<string, string> } = {},
    retryCount = 0
  ): Promise<T> {
    await this.rateLimiter.waitIfNeeded()

    const url = `${this.baseUrl}${endpoint}`
    const method = (options.method || 'POST').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE'

    const auth = Buffer.from(`${this.login}:${this.password}`).toString('base64')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      ...options.headers,
    }

    const requestBody = options.body
    const safeHeaders = { ...headers }
    if ('Authorization' in safeHeaders) {
      safeHeaders['Authorization'] = '***MASKED***'
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
        `[DataForSEO Client] 🔄 Retry ${retryCount}/${MAX_RETRIES} for ${endpoint}`
      )
    }

    try {
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,
        headers,
        data: requestBody,
        validateStatus: () => true,
      }

      const response = await axios(axiosConfig)
      const responseData = response.data

      if (response.status >= 400) {
        let errorData: DataForSEOError | null = null
        try {
          if (typeof responseData === 'object' && responseData !== null) {
            errorData = responseData as DataForSEOError
          }
        } catch {
        }

        const errorMessage = errorData?.message || errorData?.error || (responseData && typeof responseData === 'object' && 'message' in responseData ? String(responseData.message) : null) || `HTTP ${response.status}`
        const errorDetails = responseData ? (typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : String(responseData)) : 'No response data'
        
        console.error(`[DataForSEO Client] API Error Details:`)
        console.error(`  Status: ${response.status}`)
        console.error(`  Status Text: ${response.statusText || 'N/A'}`)
        console.error(`  Message: ${errorMessage}`)
        console.error(`  Full Response: ${errorDetails}`)
        console.error(`  Response Headers:`, JSON.stringify(response.headers, null, 2))

        const error = new DataForSEOClientError(
          errorMessage,
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
            `[DataForSEO Client] ⏳ Waiting ${delay}ms before retry...`
          )
          await sleep(delay)
          return this.request<T>(endpoint, options, retryCount + 1)
        }

        throw error
      }

      const data = responseData as DataForSEOApiResponse<T> | T

      if (
        typeof data === 'object' &&
        data !== null &&
        'error' in (data as Record<string, unknown>) &&
        (data as DataForSEOApiResponse<T>).error
      ) {
        const errorData = data as DataForSEOApiResponse<T>
        const error = new DataForSEOClientError(
          errorData.error?.message || errorData.error?.error || 'DataForSEO API error',
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
            `[DataForSEO Client] ⏳ Waiting ${delay}ms before retry...`
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

      if (Array.isArray(data)) {
        return data as T
      }

      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data
      ) {
        return (data as DataForSEOApiResponse<T>).data as T
      }

      return data as T
    } catch (error) {
      if (error instanceof DataForSEOClientError) {
        throw error
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        const networkError = new DataForSEOClientError(
          axiosError.message || `Network error: ${String(error)}`,
          axiosError.response?.status,
          'network_error',
          error
        )

        logRequest(
          endpoint,
          method,
          axiosError.response?.status,
          networkError.message,
          requestBody,
          axiosError.response?.data,
          url
        )

        if (retryCount < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount)
          console.log(
            `[DataForSEO Client] ⏳ Waiting ${delay}ms before retry...`
          )
          await sleep(delay)
          return this.request<T>(endpoint, options, retryCount + 1)
        }

        throw networkError
      }

      const networkError = new DataForSEOClientError(
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
          `[DataForSEO Client] ⏳ Waiting ${delay}ms before retry...`
        )
        await sleep(delay)
        return this.request<T>(endpoint, options, retryCount + 1)
      }

      throw networkError
    }
  }

  async searchOrganizations(
    params: DataForSEOOrganizationSearchParams
  ): Promise<DataForSEOOrganizationSearchResponse> {
    const keyword = params.keyword || params.industry || ''
    const searchQuery = keyword.trim()
    
    const requestBody: Record<string, unknown> = {
      keyword: searchQuery,
      language_name: 'German',
      depth: 10,
      limit: params.per_page || 25,
      offset: ((params.page || 1) - 1) * (params.per_page || 25),
    }
    
    if (params.location_coordinate) {
      requestBody.location_coordinate = params.location_coordinate
      console.log(`[DataForSEO Client] 🔍 Search parameters:`)
      console.log(`  - keyword: ${searchQuery}`)
      console.log(`  - location_coordinate: ${params.location_coordinate}`)
    } else if (params.location) {
      const location = params.location.trim()
      
      const coordinatePattern = /^-?\d+\.?\d*,-?\d+\.?\d*,\d+\.?\d*$/
      if (coordinatePattern.test(location)) {
        requestBody.location_coordinate = location
        console.log(`[DataForSEO Client] 🔍 Search parameters:`)
        console.log(`  - keyword: ${searchQuery}`)
        console.log(`  - location_coordinate: ${location}`)
      } else {
        let locationName = location
        
        if (locationName.includes(',')) {
          const parts = locationName.split(',').map(p => p.trim())
          if (parts.length >= 2) {
            const city = parts[0]
            const country = parts[parts.length - 1]
            
            if (country.length === 2 && /^[A-Z]{2}$/i.test(country)) {
              locationName = city
            } else {
              locationName = `${city}, ${country}`
            }
          }
        } else {
          locationName = locationName
        }
        
        requestBody.location_name = locationName
        console.log(`[DataForSEO Client] 🔍 Search parameters:`)
        console.log(`  - keyword: ${searchQuery}`)
        console.log(`  - location_name: ${locationName}`)
      }
    } else {
      requestBody.location_name = 'Germany'
      console.log(`[DataForSEO Client] 🔍 Search parameters:`)
      console.log(`  - keyword: ${searchQuery}`)
      console.log(`  - location_name: Germany`)
    }
    
    const body: Record<string, unknown>[] = [requestBody]

    try {
      const response = await this.request<{
        tasks?: Array<{
          result?: Array<{
            items?: Array<{
              title?: string
              domain?: string
              url?: string
              website?: string
              description?: string
              phone?: string
              address?: string
              contact_info?: Array<{
                type?: string
                value?: string
              }>
              [key: string]: unknown
            }>
          }>
        }>
      }>(
        '/business_data/business_listings/search/live',
        {
          method: 'POST',
          body: body as unknown as Record<string, unknown>,
        }
      )

      const organizations: DataForSEOOrganization[] = []
      
      if (response.tasks && response.tasks.length > 0) {
        for (const task of response.tasks) {
          if (task.result && task.result.length > 0) {
            for (const result of task.result) {
              if (result.items && result.items.length > 0) {
                for (const item of result.items) {
                  let domain = item.domain
                  let website = item.url || item.website
                  
                  if (!domain && website) {
                    try {
                      domain = new URL(website).hostname.replace(/^www\./, '')
                    } catch {
                      domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
                    }
                  }
                  
                  let phone = item.phone
                  if (!phone && item.contact_info) {
                    const phoneContact = item.contact_info.find(c => c.type === 'telephone')
                    if (phoneContact?.value) {
                      phone = phoneContact.value
                    }
                  }
                  
                  if (domain || item.title) {
                    organizations.push({
                      id: domain || item.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || undefined,
                      name: item.title || undefined,
                      domain: domain || undefined,
                      website_url: website || (domain ? `https://${domain}` : undefined),
                      description: item.description || undefined,
                      phone: phone || undefined,
                      location: item.address || undefined,
                    })
                  }
                }
              }
            }
          }
        }
      }

      return {
        organizations,
        pagination: {
          page: params.page || 1,
          per_page: params.per_page || 25,
          total_entries: organizations.length,
        }
      }
    } catch (error) {
      console.error('[DataForSEO Client] ⚠️  Business Data API not available, trying alternative method')
      console.error(JSON.stringify({ error: String(error) }, null, 2))
      
      return {
        organizations: [],
        pagination: {
          page: params.page || 1,
          per_page: params.per_page || 25,
          total_entries: 0,
        }
      }
    }
  }

  async enrichOrganization(domain: string): Promise<{ organization?: DataForSEOOrganization }> {
    try {
      const response = await this.request<{
        tasks?: Array<{
          result?: Array<{
            items?: Array<{
              title?: string
              domain?: string
              url?: string
              website?: string
              description?: string
              phone?: string
              address?: string
              contact_info?: Array<{
                type?: string
                value?: string
              }>
              [key: string]: unknown
            }>
          }>
        }>
      }>(
        '/business_data/business_listings/search/live',
        {
          method: 'POST',
          body: [
            {
              keyword: domain,
              location_name: 'Germany',
              language_name: 'German',
              limit: 1,
            }
          ] as unknown as Record<string, unknown>,
        }
      )

      if (response.tasks && response.tasks.length > 0 && response.tasks[0].result) {
        const result = response.tasks[0].result[0]
        if (result.items && result.items.length > 0) {
          const item = result.items[0]
          const itemDomain = item.domain || (item.url || item.website ? new URL(item.url || item.website || '').hostname.replace(/^www\./, '') : domain)
          
          let phone = item.phone
          if (!phone && item.contact_info) {
            const phoneContact = item.contact_info.find(c => c.type === 'telephone')
            if (phoneContact?.value) {
              phone = phoneContact.value
            }
          }
          
          return {
            organization: {
              id: itemDomain || domain,
              name: item.title || undefined,
              domain: itemDomain || domain,
              website_url: item.url || item.website || (itemDomain ? `https://${itemDomain}` : undefined),
              description: item.description || undefined,
              phone: phone || undefined,
              location: item.address || undefined,
            }
          }
        }
      }

      return { organization: undefined }
    } catch (error) {
      console.error('[DataForSEO Client] ⚠️  Organization enrichment failed')
      return { organization: undefined }
    }
  }

  async getCategories(): Promise<Array<{ category_name: string; business_count: number }>> {
    try {
      const response = await this.request<{
        tasks?: Array<{
          result?: Array<{
            category_name?: string
            business_count?: number
          }>
        }>
      }>(
        '/business_data/business_listings/categories',
        {
          method: 'GET',
        }
      )

      const categories: Array<{ category_name: string; business_count: number }> = []

      if (response.tasks && response.tasks.length > 0) {
        for (const task of response.tasks) {
          if (task.result && task.result.length > 0) {
            for (const category of task.result) {
              if (category.category_name && category.business_count !== undefined) {
                categories.push({
                  category_name: category.category_name,
                  business_count: category.business_count,
                })
              }
            }
          }
        }
      }

      return categories
    } catch (error) {
      console.error('[DataForSEO Client] ⚠️  Failed to fetch categories')
      throw error
    }
  }
}

export function createDataForSEOClient(): DataForSEOClient {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  
  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables are required')
  }
  
  const loginPreview = login.length > 10 ? `${login.substring(0, 10)}...` : login
  console.log(`[DataForSEO Client] 🔑 Using Login: ${loginPreview} (length: ${login.length})`)
  
  return new DataForSEOClient(login, password)
}
