import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const country = searchParams.get('country')

    let query = supabase
      .from('dataforseo_locations')
      .select('location_name, country_iso_code, business_count')

    if (country && country.trim()) {
      query = query.eq('country_iso_code', country.trim().toUpperCase())
    }

    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      query = query.ilike('location_name', `%${searchLower}%`)
    } else {
      query = query.order('business_count', { ascending: false }).limit(1000)
    }

    const { data: locations, error } = await query.order('business_count', { ascending: false })

    if (error) {
      console.error('[Locations API] Database error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      locations: locations || [],
    })
  } catch (error) {
    console.error('[Locations API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
