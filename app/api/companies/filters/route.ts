import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: industries, error: industriesError } = await supabase
      .from('companies')
      .select('industry')
      .eq('user_id', authUser.id)
      .not('industry', 'is', null)

    if (industriesError) {
      return NextResponse.json(
        { error: industriesError.message },
        { status: 500 }
      )
    }

    const { data: locations, error: locationsError } = await supabase
      .from('companies')
      .select('location')
      .eq('user_id', authUser.id)
      .not('location', 'is', null)

    if (locationsError) {
      return NextResponse.json(
        { error: locationsError.message },
        { status: 500 }
      )
    }

    const uniqueIndustries = Array.from(
      new Set(industries?.map((c) => c.industry).filter(Boolean) || [])
    ).sort()

    const uniqueLocations = Array.from(
      new Set(locations?.map((c) => c.location).filter(Boolean) || [])
    ).sort()

    return NextResponse.json({
      industries: uniqueIndustries,
      locations: uniqueLocations,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


