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
      .select('location, dataforseo_city')
      .eq('user_id', authUser.id)
      .or('location.not.is.null,dataforseo_city.not.is.null')

    if (locationsError) {
      return NextResponse.json(
        { error: locationsError.message },
        { status: 500 }
      )
    }

    const uniqueIndustries = Array.from(
      new Set(industries?.map((c) => c.industry).filter(Boolean) || [])
    ).sort()

    const citySet = new Set<string>()
    if (locations) {
      for (const entry of locations) {
        const city = (entry as any).dataforseo_city?.trim()
        const loc = (entry as any).location?.trim()

        if (city) {
          citySet.add(city)
          continue
        }

        if (loc) {
          const parts = loc.split(',').map((p: string) => p.trim()).filter(Boolean)
          if (parts.length > 1) {
            citySet.add(parts[parts.length - 1])
          } else {
            citySet.add(parts[0])
          }
        }
      }
    }

    const uniqueLocations = Array.from(citySet).sort()

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



