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
    const categoryName = searchParams.get('category')
    const locationParam = searchParams.get('location')

    if (!categoryName) {
      return NextResponse.json(
        { error: 'category parameter is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('companies')
      .select('id, name, email, website')
      .eq('user_id', user.id)
      .contains('dataforseo_category_ids', [categoryName])

    if (locationParam && locationParam.trim()) {
      query = query.eq('location', locationParam.trim())
    }

    const { data: companies, error: companiesError } = await query

    if (companiesError) {
      console.error('[Campaigns Emails] Database error:', companiesError)
      return NextResponse.json(
        { error: companiesError.message },
        { status: 500 }
      )
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        emails: [],
        companies: [],
        total: 0,
      })
    }

    const filteredCompanies = companies

    const companyIds = filteredCompanies.map((c) => c.id)

    const { data: companyEmails, error: emailsError } = await supabase
      .from('company_emails')
      .select('company_id, email, source_url, confidence_score')
      .eq('owner_user_id', user.id)
      .in('company_id', companyIds)

    if (emailsError) {
      console.error('[Campaigns Emails] Emails error:', emailsError)
      return NextResponse.json(
        { error: emailsError.message },
        { status: 500 }
      )
    }

    const emailMap = new Map<string, any[]>()
    if (companyEmails) {
      for (const email of companyEmails) {
        if (!emailMap.has(email.company_id)) {
          emailMap.set(email.company_id, [])
        }
        emailMap.get(email.company_id)!.push(email)
      }
    }

    const companiesWithEmails = filteredCompanies.map((company) => {
      const emails = emailMap.get(company.id) || []
      const directEmail = company.email ? [{
        email: company.email,
        source_url: company.website || '',
        confidence_score: 100,
      }] : []

      return {
        ...company,
        emails: [...directEmail, ...emails],
      }
    })

    const allEmails: Array<{
      email: string
      company_name: string
      company_website: string | null
      source_url: string
      confidence_score: number
    }> = []

    for (const company of companiesWithEmails) {
      for (const emailData of company.emails) {
        allEmails.push({
          email: emailData.email,
          company_name: company.name,
          company_website: company.website,
          source_url: emailData.source_url,
          confidence_score: emailData.confidence_score,
        })
      }
    }

    const uniqueEmails = Array.from(
      new Map(allEmails.map((e) => [e.email.toLowerCase(), e])).values()
    )

    return NextResponse.json({
      emails: uniqueEmails,
      companies: companiesWithEmails,
      total: uniqueEmails.length,
      category: categoryName,
    })
  } catch (error) {
    console.error('[Campaigns Emails] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
