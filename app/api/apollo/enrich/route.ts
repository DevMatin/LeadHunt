import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'Person and email enrichment is disabled. Only organization name and domain are retrieved from DataForSEO.' },
    { status: 403 }
  )
}


