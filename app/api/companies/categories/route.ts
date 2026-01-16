import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('dataforseo_category_ids')
      .eq('user_id', user.id)
      .not('dataforseo_category_ids', 'is', null)

    if (companiesError) {
      console.error('[Companies Categories] Database error:', companiesError)
      return NextResponse.json(
        { error: companiesError.message },
        { status: 500 }
      )
    }

    const categorySet = new Set<string>()
    if (companies) {
      for (const company of companies) {
        if (company.dataforseo_category_ids && Array.isArray(company.dataforseo_category_ids)) {
          for (const categoryId of company.dataforseo_category_ids) {
            if (categoryId && categoryId.trim().length > 0) {
              categorySet.add(categoryId.trim())
            }
          }
        }
      }
    }

    const categoryIds = Array.from(categorySet)
    
    if (categoryIds.length === 0) {
      return NextResponse.json({
        categories: [],
      })
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('dataforseo_categories')
      .select('category_name, business_count')
      .in('category_name', categoryIds)
      .order('category_name', { ascending: true })

    if (categoriesError) {
      console.error('[Companies Categories] Categories error:', categoriesError)
      return NextResponse.json(
        { error: categoriesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      categories: categories || [],
    })
  } catch (error) {
    console.error('[Companies Categories] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
