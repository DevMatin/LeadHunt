import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { findCompanyOwnerByName } from '@/lib/integrations/apollo/enrich'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyIds } = body as { companyIds: string[] }

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: 'companyIds array is required' },
        { status: 400 }
      )
    }

    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, owner_first_name, owner_email')
      .eq('user_id', user.id)
      .in('id', companyIds)

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { error: 'No companies found' },
        { status: 404 }
      )
    }

    const enrichedCompanies = []

    for (const company of companies) {
      if (company.owner_email) {
        enrichedCompanies.push(company)
        continue
      }

      if (!company.name) {
        continue
      }

      try {
        const owner = await findCompanyOwnerByName(company.name, true)

        if (owner && owner.email) {
          const updateData: {
            owner_first_name?: string
            owner_last_name?: string
            owner_email?: string
            owner_title?: string
            owner_enriched_at?: string
          } = {
            owner_first_name: owner.first_name || undefined,
            owner_last_name: owner.last_name || undefined,
            owner_email: owner.email || undefined,
            owner_title: owner.title || undefined,
            owner_enriched_at: new Date().toISOString(),
          }

          const { data: updated, error: updateError } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', company.id)
            .eq('user_id', user.id)
            .select()
            .single()

          if (!updateError && updated && updated.owner_email) {
            enrichedCompanies.push(updated)
          }
        }
      } catch (error) {
        console.error(`Failed to enrich company ${company.id}:`, error)
      }
    }

    return NextResponse.json({ data: enrichedCompanies }, { status: 200 })
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

