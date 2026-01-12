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

    const { data: categories, error: categoriesError } = await supabase
      .from('dataforseo_categories')
      .select('category_name, business_count')
      .order('business_count', { ascending: false })
      .limit(1000)

    if (categoriesError) {
      console.error('[Campaigns Categories] Database error:', categoriesError)
      return NextResponse.json(
        { error: categoriesError.message },
        { status: 500 }
      )
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json({
        categories: [],
      })
    }

    const { data: allCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('id, email, dataforseo_category_ids')
      .eq('user_id', user.id)
      .not('dataforseo_category_ids', 'is', null)

    if (companiesError) {
      console.error('[Campaigns Categories] Companies error:', companiesError)
      return NextResponse.json(
        { error: companiesError.message },
        { status: 500 }
      )
    }

    const companyIds = allCompanies?.map((c) => c.id) || []
    let allCompanyEmails: Array<{ company_id: string }> = []

    if (companyIds.length > 0) {
      const { data: emailsData } = await supabase
        .from('company_emails')
        .select('company_id')
        .eq('owner_user_id', user.id)
        .in('company_id', companyIds)

      allCompanyEmails = emailsData || []
    }

    const emailCountByCompany = new Map<string, number>()
    for (const email of allCompanyEmails) {
      emailCountByCompany.set(
        email.company_id,
        (emailCountByCompany.get(email.company_id) || 0) + 1
      )
    }

    const categoryStats = categories.map((category) => {
      const matchingCompanies = allCompanies?.filter((company) =>
        company.dataforseo_category_ids?.includes(category.category_name)
      ) || []

      const companyCount = matchingCompanies.length

      if (companyCount === 0) {
        return {
          ...category,
          company_count: 0,
          email_count: 0,
        }
      }

      let emailCount = 0
      for (const company of matchingCompanies) {
        emailCount += emailCountByCompany.get(company.id) || 0
        if (company.email) {
          emailCount += 1
        }
      }

      return {
        ...category,
        company_count: companyCount,
        email_count: emailCount,
      }
    })

    return NextResponse.json({
      categories: categoryStats.filter((cat) => cat.company_count > 0),
    })
  } catch (error) {
    console.error('[Campaigns Categories] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
