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
    
    console.log('[Locations Sync] Abrufe alle Länder...')
    const countries = await client.getSupportedLocations()

    if (countries.length === 0) {
      return NextResponse.json(
        { error: 'Keine Länder gefunden' },
        { status: 404 }
      )
    }

    console.log(`[Locations Sync] ${countries.length} Länder gefunden. Abrufe Städte für jedes Land...`)

    function sanitizeText(text: string): string {
      return text
        .replace(/\u0000/g, '')
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
        .trim()
    }

    const allLocations: Array<{ location_name: string; country_iso_code: string; business_count: number }> = []
    
    for (const country of countries) {
      if (!country.country_iso_code) continue
      
      try {
        console.log(`[Locations Sync] Abrufe Locations für ${country.location_name} (${country.country_iso_code})...`)
        const countryLocations = await client.getSupportedLocations(country.country_iso_code.toLowerCase())
        
        if (countryLocations.length > 0) {
          allLocations.push(...countryLocations)
          console.log(`[Locations Sync] ${countryLocations.length} Locations für ${country.location_name} gefunden`)
        } else {
          allLocations.push({
            location_name: country.location_name,
            country_iso_code: country.country_iso_code,
            business_count: country.business_count,
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[Locations Sync] Fehler beim Abrufen von Locations für ${country.location_name}:`, error)
        allLocations.push({
          location_name: country.location_name,
          country_iso_code: country.country_iso_code,
          business_count: country.business_count,
        })
      }
    }

    const locationsToInsert = allLocations
      .filter((loc) => loc.location_name && loc.location_name.trim().length > 0 && loc.country_iso_code && loc.country_iso_code.trim().length > 0)
      .map((loc) => ({
        location_name: sanitizeText(loc.location_name),
        country_iso_code: sanitizeText(loc.country_iso_code).toUpperCase(),
        business_count: loc.business_count || 0,
        synced_at: new Date().toISOString(),
      }))
      .filter((loc) => loc.location_name.length > 0 && loc.country_iso_code.length > 0)

    const { data, error } = await supabase
      .from('dataforseo_locations')
      .upsert(locationsToInsert, {
        onConflict: 'location_name,country_iso_code',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('[Locations Sync] Database error:', error)
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Locations', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      synced: locationsToInsert.length,
      countries: countries.length,
      message: `${locationsToInsert.length} Locations aus ${countries.length} Ländern erfolgreich synchronisiert`,
    })
  } catch (error) {
    console.error('[Locations Sync] Error:', error)
    return NextResponse.json(
      {
        error: 'Fehler beim Synchronisieren der Locations',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
