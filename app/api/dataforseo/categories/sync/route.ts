import { NextResponse } from 'next/server'
import { createDataForSEOClient } from '@/lib/integrations/dataforseo/client'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const client = createDataForSEOClient()
    const categories = await client.getCategories()

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'Keine Kategorien gefunden' },
        { status: 404 }
      )
    }

    function sanitizeText(text: string): string {
      return text
        .replace(/\u0000/g, '')
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
        .trim()
    }

    const categoriesToInsert = categories
      .filter((cat) => cat.category_name && cat.category_name.trim().length > 0)
      .map((cat) => ({
        category_name: sanitizeText(cat.category_name),
        business_count: cat.business_count || 0,
        synced_at: new Date().toISOString(),
      }))
      .filter((cat) => cat.category_name.length > 0)

    const { data, error } = await supabase
      .from('dataforseo_categories')
      .upsert(categoriesToInsert, {
        onConflict: 'category_name',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('[Categories Sync] Database error:', error)
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Kategorien', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      synced: categories.length,
      message: `${categories.length} Kategorien erfolgreich synchronisiert`,
    })
  } catch (error) {
    console.error('[Categories Sync] Error:', error)
    return NextResponse.json(
      {
        error: 'Fehler beim Synchronisieren der Kategorien',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
