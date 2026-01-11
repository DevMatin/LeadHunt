'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { translateCategory } from '@/lib/utils/categoryTranslations'

interface Category {
  category_name: string
  business_count: number
}

interface Location {
  location_name: string
  country_iso_code: string
  business_count: number
}

export default function SearchPage() {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [showCustomIndustry, setShowCustomIndustry] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [showCustomLocation, setShowCustomLocation] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
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

  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) {
      return []
    }

    const searchLower = locationSearch.toLowerCase()
    const filtered = allLocations.filter((loc) => {
      const locationName = loc.location_name.toLowerCase()
      return loc.country_iso_code === 'DE' && locationName.includes(searchLower)
    })
    
    return filtered.sort((a, b) => {
      const aStartsWith = a.location_name.toLowerCase().startsWith(searchLower)
      const bStartsWith = b.location_name.toLowerCase().startsWith(searchLower)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return b.business_count - a.business_count
    })
  }, [allLocations, locationSearch])

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

  const fetchLocations = async (searchTerm?: string) => {
    try {
      setLocationsLoading(true)
      let url = '/api/dataforseo/locations?country=DE'
      
      if (searchTerm && searchTerm.trim()) {
        const search = searchTerm.trim()
        url = `/api/dataforseo/locations?search=${encodeURIComponent(search)}&country=DE`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const locations = (data.locations || []).filter((loc: Location) => loc.country_iso_code === 'DE')
        
        if (searchTerm && searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase().trim()
          const filtered = locations.filter((loc: Location) => {
            const locationName = loc.location_name.toLowerCase()
            return locationName.includes(searchLower)
          })
          setAllLocations(filtered)
        } else {
          setAllLocations(locations)
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden der Locations:', err)
    } finally {
      setLocationsLoading(false)
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

  useEffect(() => {
    if (locationSearch.trim()) {
      const timeoutId = setTimeout(() => {
        fetchLocations(locationSearch)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setAllLocations([])
    }
  }, [locationSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!industry) {
      setError('Bitte wählen Sie eine Kategorie aus')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          industry, 
          location, 
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
            <label htmlFor="location" className="block mb-2 text-gray-700">
              Standort
            </label>
            {!showCustomLocation ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Deutsche Städte durchsuchen..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {location && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                      Ausgewählt: {location}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocation('')}
                      className="text-sm text-blue-600 hover:text-blue-700 ml-auto"
                    >
                      ✕ Entfernen
                    </button>
                  </div>
                )}
                {locationSearch && (
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {locationsLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        Suche...
                      </div>
                    ) : filteredLocations.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {filteredLocations.map((loc) => (
                          <button
                            key={`${loc.location_name}-${loc.country_iso_code}`}
                            type="button"
                            onClick={() => {
                              setLocation(`${loc.location_name}, ${loc.country_iso_code}`)
                              setLocationSearch('')
                            }}
                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                              location === `${loc.location_name}, ${loc.country_iso_code}` ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              {loc.location_name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {loc.country_iso_code} • {loc.business_count.toLocaleString()} Unternehmen
                            </div>
                          </button>
                        ))}
                        {locationSearch.trim() && !filteredLocations.some(loc => loc.location_name.toLowerCase() === locationSearch.toLowerCase().trim() && loc.country_iso_code === 'DE') && (
                          <button
                            type="button"
                            onClick={() => {
                              const searchTerm = locationSearch.trim()
                              setLocation(`${searchTerm}, DE`)
                              setLocationSearch('')
                            }}
                            className="w-full text-left p-4 hover:bg-gray-50 transition-colors border-t border-gray-200 bg-blue-50"
                          >
                            <div className="font-medium text-gray-900">
                              {locationSearch.trim()} (DE)
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Als deutsche Stadt verwenden
                            </div>
                          </button>
                        )}
                      </div>
                    ) : locationSearch.trim() ? (
                      <div className="divide-y divide-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            const searchTerm = locationSearch.trim()
                            setLocation(`${searchTerm}, DE`)
                            setLocationSearch('')
                          }}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">
                            {locationSearch.trim()} (DE)
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Als deutsche Stadt verwenden
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Keine deutschen Städte gefunden
                      </div>
                    )}
                  </div>
                )}
                {!locationSearch && !location && (
                  <button
                    type="button"
                    onClick={() => setShowCustomLocation(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Eigene Eingabe
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Berlin, Germany"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomLocation(false)
                    setLocation('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Zur Städte-Suche
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="maxResults" className="block mb-2 text-gray-700">
              Maximale Anzahl Ergebnisse
            </label>
            <input
              id="maxResults"
              type="number"
              min="1"
              max="1000"
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. 100"
            />
            <p className="mt-1 text-sm text-gray-500">
              Anzahl der Unternehmen, die von Apollo abgerufen werden sollen (spart Credits)
            </p>
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
