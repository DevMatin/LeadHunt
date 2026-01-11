import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'Company enrichment is disabled. Only organization name and domain are retrieved from Apollo.' },
    { status: 403 }
  )
}

