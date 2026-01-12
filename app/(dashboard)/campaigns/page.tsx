'use client'

import { useState, useEffect, useMemo } from 'react'
import { translateCategory } from '@/lib/utils/categoryTranslations'

interface Category {
  category_name: string
  business_count: number
}

interface Email {
  email: string
  company_name: string
  company_website: string | null
  source_url: string
  confidence_score: number
}

export default function CampaignsPage() {
  const [mounted, setMounted] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [emails, setEmails] = useState<Email[]>([])
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      setCategoriesLoading(true)
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

  const fetchLocations = async () => {
    try {
      setLocationsLoading(true)
      const response = await fetch('/api/companies/filters')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (err) {
      console.error('Fehler beim Laden der Standorte:', err)
    } finally {
      setLocationsLoading(false)
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])

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

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName)
    setCategorySearch('')
  }

  const fetchEmails = async () => {
    if (!selectedCategory) {
      setError('Bitte wählen Sie eine Kategorie aus')
      return
    }

    try {
      setEmailsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        category: selectedCategory,
      })

      if (locationFilter) {
        params.append('location', locationFilter)
      }

      const response = await fetch(`/api/campaigns/emails?${params.toString()}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Laden der E-Mails')
      }
      const data = await response.json()
      setEmails(data.emails || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setEmailsLoading(false)
    }
  }

  const exportToCSV = () => {
    if (emails.length === 0) return

    const headers = ['E-Mail', 'Firmenname', 'Website', 'Quelle', 'Confidence Score']
    const rows = emails.map((e) => [
      e.email,
      e.company_name,
      e.company_website || '',
      e.source_url,
      e.confidence_score.toString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `emails_${selectedCategory?.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6">Kampagnen</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Kategorie auswählen</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Standort auswählen</h2>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">E-Mails</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="mb-6">Kampagnen</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Kategorie auswählen</h2>
          <div className="space-y-2">
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Kategorien durchsuchen..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedCategory && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  Ausgewählt: {translateCategory(selectedCategory)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
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
                        onClick={() => handleCategorySelect(cat.category_name)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedCategory === cat.category_name
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : ''
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
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Standort auswählen</h2>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            disabled={locationsLoading}
          >
            <option value="">Alle Standorte</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">E-Mails</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchEmails}
              disabled={!selectedCategory || emailsLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailsLoading ? 'Lade...' : 'E-Mails laden'}
            </button>
            {emails.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                CSV Export
              </button>
            )}
          </div>
        </div>

        {emailsLoading ? (
          <div className="text-center py-8 text-gray-500">Lade E-Mails...</div>
        ) : emails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {!selectedCategory
              ? 'Bitte wählen Sie eine Kategorie aus, dann klicken Sie auf "E-Mails laden"'
              : 'Keine E-Mails für diese Kategorie gefunden'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            <div className="text-sm text-gray-600 mb-3">
              {emails.length} E-Mail{emails.length !== 1 ? 's' : ''} gefunden
            </div>
            {emails.map((email, index) => (
              <div
                key={`${email.email}-${index}`}
                className="p-3 border border-gray-200 rounded-lg"
              >
                <div className="font-medium text-gray-900">{email.email}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {email.company_name}
                  {email.company_website && (
                    <span className="ml-2 text-gray-400">
                      • {email.company_website}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {email.confidence_score}% • Quelle: {email.source_url}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
