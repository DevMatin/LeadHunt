import { createAdminClient } from './admin'
import type { EnrichResponse, MatchQuality } from '@/lib/integrations/apollo/types'

export interface LeadEnrichment {
  id: string
  email: string
  input_company_name: string
  match_quality: MatchQuality
  apollo_person_id?: string | null
  person_name?: string | null
  person_title?: string | null
  organization_name?: string | null
  organization_domain?: string | null
  raw?: unknown
  created_at: string
}

export interface SaveEnrichmentParams {
  email: string
  inputCompanyName: string
  enrichResponse: EnrichResponse & { raw?: unknown }
}

export async function saveEnrichment(
  params: SaveEnrichmentParams
): Promise<LeadEnrichment> {
  const supabase = createAdminClient()

  const personName = params.enrichResponse.person
    ? params.enrichResponse.person.name || null
    : null

  const { data, error } = await supabase
    .from('lead_enrichments')
    .insert({
      email: params.email,
      input_company_name: params.inputCompanyName,
      match_quality: params.enrichResponse.matchQuality,
      apollo_person_id: params.enrichResponse.person?.apolloId || null,
      person_name: personName,
      person_title: params.enrichResponse.person?.title || null,
      organization_name: params.enrichResponse.organization?.name || null,
      organization_domain: params.enrichResponse.organization?.domain || null,
      raw: params.enrichResponse.raw || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save enrichment: ${error.message}`)
  }

  return data as LeadEnrichment
}

