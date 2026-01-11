'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const [syncingCategories, setSyncingCategories] = useState(false)
  const [syncCategoriesResult, setSyncCategoriesResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const [syncingLocations, setSyncingLocations] = useState(false)
  const [syncLocationsResult, setSyncLocationsResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSyncCategories = async () => {
    setSyncingCategories(true)
    setSyncCategoriesResult(null)

    try {
      const response = await fetch('/api/dataforseo/categories/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setSyncCategoriesResult({
          success: true,
          message: data.message || `${data.synced} Kategorien synchronisiert`,
        })
      } else {
        setSyncCategoriesResult({
          success: false,
          message: data.error || 'Fehler beim Synchronisieren',
        })
      }
    } catch (error) {
      setSyncCategoriesResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
    } finally {
      setSyncingCategories(false)
    }
  }

  const handleSyncLocations = async () => {
    setSyncingLocations(true)
    setSyncLocationsResult(null)

    try {
      const response = await fetch('/api/dataforseo/locations/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setSyncLocationsResult({
          success: true,
          message: data.message || `${data.synced} Locations synchronisiert`,
        })
      } else {
        setSyncLocationsResult({
          success: false,
          message: data.error || 'Fehler beim Synchronisieren',
        })
      }
    } catch (error) {
      setSyncLocationsResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
    } finally {
      setSyncingLocations(false)
    }
  }

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6">Einstellungen</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">DataForSEO Kategorien</h2>
          <p className="text-gray-600 mb-4">
            Synchronisiere alle verfügbaren Kategorien von DataForSEO in die Datenbank.
          </p>
          <Button disabled variant="primary">
            Kategorien synchronisieren
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">DataForSEO Locations</h2>
          <p className="text-gray-600 mb-4">
            Synchronisiere alle verfügbaren Locations von DataForSEO in die Datenbank.
          </p>
          <Button disabled variant="primary">
            Locations synchronisieren
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="mb-6">Einstellungen</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">DataForSEO Kategorien</h2>
        <p className="text-gray-600 mb-4">
          Synchronisiere alle verfügbaren Kategorien von DataForSEO in die Datenbank.
        </p>
        <Button
          onClick={handleSyncCategories}
          disabled={syncingCategories}
          variant="primary"
        >
          {syncingCategories ? 'Synchronisiere...' : 'Kategorien synchronisieren'}
        </Button>

        {syncCategoriesResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              syncCategoriesResult.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {syncCategoriesResult.message}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">DataForSEO Locations</h2>
        <p className="text-gray-600 mb-4">
          Synchronisiere alle verfügbaren Locations von DataForSEO in die Datenbank.
        </p>
        <Button
          onClick={handleSyncLocations}
          disabled={syncingLocations}
          variant="primary"
        >
          {syncingLocations ? 'Synchronisiere...' : 'Locations synchronisieren'}
        </Button>

        {syncLocationsResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              syncLocationsResult.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {syncLocationsResult.message}
          </div>
        )}
      </div>
    </div>
  )
}




