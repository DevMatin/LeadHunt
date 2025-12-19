import { NextResponse } from 'next/server'
import { enrichPersonByEmailAndCompany } from '@/lib/integrations/apollo/enrich'
import { saveEnrichment } from '@/lib/supabase/enrichments'
import { ApolloClientError } from '@/lib/integrations/apollo/client'
import type { EnrichRequest } from '@/lib/integrations/apollo/types'

export async function POST(request: Request) {
  try {
    let body: EnrichRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { companyName, email } = body

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
      return NextResponse.json(
        { error: 'companyName is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json(
        { error: 'email is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'email must be a valid email address' },
        { status: 400 }
      )
    }

    const enrichRequest: EnrichRequest = {
      companyName: companyName.trim(),
      email: email.trim(),
    }

    const enrichResponse = await enrichPersonByEmailAndCompany(enrichRequest)

    await saveEnrichment({
      email: enrichRequest.email,
      inputCompanyName: enrichRequest.companyName,
      enrichResponse,
    })

    const response = {
      person: enrichResponse.person,
      organization: enrichResponse.organization,
      matchQuality: enrichResponse.matchQuality,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API Apollo Enrich] ❌ Error:', error)

    if (error instanceof ApolloClientError) {
      return NextResponse.json(
        { error: `Apollo API error: ${error.message}` },
        { status: 502 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }
      if (error.message.includes('APOLLO_API_KEY')) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

