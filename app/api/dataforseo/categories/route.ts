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

    let query = supabase
      .from('dataforseo_categories')
      .select('category_name, business_count')

    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      query = query.ilike('category_name', `%${searchLower}%`)
    } else {
      query = query.order('business_count', { ascending: false }).limit(1000)
    }

    const { data: categories, error } = await query.order('business_count', { ascending: false })

    if (error) {
      console.error('[Categories API] Database error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      categories: categories || [],
    })
  } catch (error) {
    console.error('[Categories API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
