import type { MatchQuality } from './types'

export function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return ''
  return name.toLowerCase().trim()
}

export function matchCompanyName(
  inputCompanyName: string,
  apolloOrganizationName: string | null | undefined
): MatchQuality {
  const normalizedInput = normalizeCompanyName(inputCompanyName)
  
  if (!apolloOrganizationName) {
    return 'unknown'
  }
  
  const normalizedApollo = normalizeCompanyName(apolloOrganizationName)
  
  if (normalizedInput === normalizedApollo) {
    return 'exact'
  }
  
  return 'mismatch'
}


