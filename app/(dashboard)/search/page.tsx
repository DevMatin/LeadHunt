'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { translateCategory } from '@/lib/utils/categoryTranslations'

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Radius (km):
        </label>
        <input
          type="number"
          min="1"
          max="100"
          defaultValue="10"
          disabled
          className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
        />
        <span className="text-sm text-gray-500">Karte wird geladen...</span>
      </div>
      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="text-gray-500">Karte wird geladen...</span>
      </div>
    </div>
  ),
})

interface Category {
  category_name: string
  business_count: number
}

export default function SearchPage() {
  const [industry, setIndustry] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [locationRadius, setLocationRadius] = useState(10)
  const [maxResults, setMaxResults] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [showCustomIndustry, setShowCustomIndustry] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const router = useRouter()

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return []
    }

    const searchLower = categorySearch.toLowerCase()
    return allCategories.filter((cat) => {
      const englishName = cat.category_name.toLowerCase()
      const germanName = translateCategory(cat.category_name).toLowerCase()
      return englishName.includes(searchLower) || germanName.includes(searchLower)
    })
  }, [allCategories, categorySearch])

  const fetchCategories = async (searchTerm?: string) => {
    try {
      const url = searchTerm && searchTerm.trim()
        ? `/api/dataforseo/categories?search=${encodeURIComponent(searchTerm.trim())}`
        : '/api/dataforseo/categories'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAllCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    if (categorySearch.trim()) {
      const timeoutId = setTimeout(() => {
        fetchCategories(categorySearch)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setAllCategories([])
    }
  }, [categorySearch])

  const handleLocationSelect = (lat: number, lng: number, radius: number) => {
    setLocationLat(lat)
    setLocationLng(lng)
    setLocationRadius(Math.min(radius, 100))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!industry) {
      setError('Bitte wählen Sie eine Kategorie aus')
      return
    }
    if (!locationLat || !locationLng) {
      setError('Bitte wählen Sie einen Standort auf der Karte aus')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const limitedRadius = Math.min(locationRadius, 100)
      const locationCoordinate = `${locationLat},${locationLng},${limitedRadius}`
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          industry, 
          location_coordinate: locationCoordinate,
          maxResults: maxResults ? parseInt(maxResults, 10) : 100 
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern der Suche')
      }

      const { data } = await response.json()

      router.push(`/companies?search=${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="mb-6">Neue Suche</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="industry" className="block mb-2 text-gray-700">
              Branche / Kategorie
            </label>
            {!showCustomIndustry ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Kategorien durchsuchen..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {industry && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                      Ausgewählt: {translateCategory(industry)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIndustry('')}
                      className="text-sm text-blue-600 hover:text-blue-700 ml-auto"
                    >
                      ✕ Entfernen
                    </button>
                  </div>
                )}
                {categorySearch && (
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {categoriesLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        Suche...
                      </div>
                    ) : filteredCategories.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.category_name}
                            type="button"
                            onClick={() => {
                              setIndustry(cat.category_name)
                              setCategorySearch('')
                            }}
                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                              industry === cat.category_name ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              {translateCategory(cat.category_name)}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {cat.business_count.toLocaleString()} Unternehmen
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Keine Kategorien gefunden
                      </div>
                    )}
                  </div>
                )}
                {!categorySearch && !industry && (
                  <button
                    type="button"
                    onClick={() => setShowCustomIndustry(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Eigene Eingabe
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  id="industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Software, Healthcare, Fintech"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomIndustry(false)
                    setIndustry('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Zur Kategorien-Auswahl
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block mb-2 text-gray-700">
              Standort
            </label>
            <LocationMap
              onLocationSelect={handleLocationSelect}
              initialLat={locationLat || undefined}
              initialLng={locationLng || undefined}
              initialRadius={locationRadius}
            />
          </div>
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird gespeichert...' : 'Suche starten'}
          </button>
        </form>
      </div>
    </div>
  )
}
