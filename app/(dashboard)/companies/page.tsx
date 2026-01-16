'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Download, RefreshCw, Filter, Building2, Mail, MapPin, Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { translateCategory } from '@/lib/utils/categoryTranslations'

interface Company {
  id: string
  name: string
  industry: string
  location: string
  website: string | null
  email: string | null
  phone: string | null
  created_at: string
  owner_first_name?: string | null
  owner_last_name?: string | null
  owner_email?: string | null
  owner_title?: string | null
  crawl_status?: string | null
  email_count?: number
}

interface Category {
  category_name: string
  business_count: number
}

export default function CompaniesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [industries, setIndustries] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [recrawling, setRecrawling] = useState(false)

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/companies/categories')
      if (response.ok) {
        const data = await response.json()
        setAvailableCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const locationParam = searchParams.get('location')
    
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
    if (locationParam) {
      setLocationFilter(locationParam)
    }
    
    fetchFilters()
    fetchCategories()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    const searchId = searchParams.get('search')
    if (searchId) params.append('search', searchId)
    if (selectedCategory) params.append('category', selectedCategory)
    if (locationFilter) params.append('location', locationFilter)
    
    const currentCategory = searchParams.get('category')
    const currentLocation = searchParams.get('location')
    const currentSearch = searchParams.get('search')
    
    const needsUpdate = 
      currentCategory !== selectedCategory ||
      currentLocation !== locationFilter ||
      currentSearch !== searchId
    
    if (needsUpdate) {
      const newQueryString = params.toString()
      const newUrl = `/companies${newQueryString ? `?${newQueryString}` : ''}`
      router.replace(newUrl)
    }
    
    fetchCompanies()
    setSelectedCompanies(new Set())
  }, [selectedCategory, locationFilter])

  const fetchFilters = async () => {
    setFiltersLoading(true)
    try {
      const response = await fetch('/api/companies/filters')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Filter-Optionen')
      }
      const { industries, locations } = await response.json()
      setIndustries(industries || [])
      setLocations(locations || [])
    } catch (err) {
      console.error('Fehler beim Laden der Filter:', err)
    } finally {
      setFiltersLoading(false)
    }
  }


  const fetchCompanies = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const searchId = searchParams.get('search')
      if (searchId) params.append('search', searchId)
      if (selectedCategory) params.append('category', selectedCategory)
      if (locationFilter) params.append('location', locationFilter)

      const response = await fetch(`/api/companies?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Unternehmen')
      }

      const { data } = await response.json()
      
      const companiesData = (data || []).map((company: any) => {
        const emailCount = Number(company.email_count) || 0
        return {
          id: company.id,
          name: company.name,
          industry: company.industry,
          location: company.location,
          website: company.website || null,
          email: company.email || null,
          phone: company.phone || null,
          created_at: company.created_at,
          owner_first_name: company.owner_first_name || null,
          owner_last_name: company.owner_last_name || null,
          owner_email: company.owner_email || null,
          owner_title: company.owner_title || null,
          crawl_status: company.crawl_status || null,
          email_count: emailCount,
        }
      })
      setCompanies(companiesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(companyId)) {
        newSet.delete(companyId)
      } else {
        newSet.add(companyId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedCompanies.size === companies.length) {
      setSelectedCompanies(new Set())
    } else {
      setSelectedCompanies(new Set(companies.map((c) => c.id)))
    }
  }

  const escapeCsvField = (field: string | null | undefined): string => {
    if (!field) return ''
    const str = String(field)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const exportToCsv = async () => {
    const selectedIds = companies.filter((c) => selectedCompanies.has(c.id))
    const selected = selectedIds.filter((c) => {
      const hasEmail = (c.owner_email && c.owner_email.trim() !== '') || (c.email && c.email.trim() !== '')
      return hasEmail
    })
    
    if (selected.length === 0) {
      const totalSelected = selectedIds.length
      const withEmail = selectedIds.filter((c) => {
        const hasEmail = (c.owner_email && c.owner_email.trim() !== '') || (c.email && c.email.trim() !== '')
        return hasEmail
      }).length
      alert(
        `Von ${totalSelected} ausgewählten Unternehmen haben ${withEmail} eine E-Mail-Adresse.\n\nBitte wählen Sie mindestens ein Unternehmen mit E-Mail-Adresse aus.`
      )
      return
    }

    const companiesNeedingEnrichment = selected.filter((c) => !c.owner_first_name && !c.owner_email && c.name)
    
    if (companiesNeedingEnrichment.length > 0) {
      const shouldEnrich = confirm(
        `${companiesNeedingEnrichment.length} Unternehmen haben noch keine Geschäftsführer-Daten.\n\nMöchten Sie diese jetzt abrufen? (Dies kann einige Zeit dauern und Credits verbrauchen)`
      )
      
      if (shouldEnrich) {
        try {
          const response = await fetch('/api/companies/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyIds: companiesNeedingEnrichment.map((c) => c.id),
            }),
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.data) {
              setCompanies((prevCompanies) => {
                return prevCompanies.map((c) => {
                  const enriched = result.data.find((e: Company) => e.id === c.id)
                  return enriched ? { ...c, ...enriched } : c
                })
              })
              alert(`✅ ${result.data.length} Unternehmen wurden angereichert.`)
            }
          }
        } catch (error) {
          console.error('Enrichment failed:', error)
          alert('⚠️ Enrichment fehlgeschlagen. Export wird mit vorhandenen Daten fortgesetzt.')
        }
      }
    }

    const headers = ['EMAIL', 'FIRSTNAME', 'LASTNAME', 'COMPANY', 'WEBSITE', 'INDUSTRY', 'LOCATION']
    const rows = selected.map((company) => [
      escapeCsvField(company.owner_email || company.email || ''),
      escapeCsvField(company.owner_first_name || ''),
      escapeCsvField(company.owner_last_name || ''),
      escapeCsvField(company.name),
      escapeCsvField(company.website || ''),
      escapeCsvField(company.industry),
      escapeCsvField(company.location),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    link.download = `companies-export-${timestamp}.csv`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const allSelected = companies.length > 0 && selectedCompanies.size === companies.length
  const someSelected = selectedCompanies.size > 0
  const exportableCount = companies.filter((c) => {
    if (!selectedCompanies.has(c.id)) return false
    const hasEmail = (c.owner_email && c.owner_email.trim() !== '') || (c.email && c.email.trim() !== '')
    return hasEmail
  }).length

  const companiesWithoutEmails = companies.filter((c) => {
    const hasEmail = (c.owner_email && c.owner_email.trim() !== '') || (c.email && c.email.trim() !== '')
    const hasEmailCount = (c.email_count ?? 0) > 0
    return !hasEmail && !hasEmailCount && c.website
  })

  const handleRecrawlNoEmails = async () => {
    if (companiesWithoutEmails.length === 0) {
      alert('Keine Unternehmen ohne E-Mails gefunden.')
      return
    }

    const confirmed = confirm(
      `${companiesWithoutEmails.length} Unternehmen ohne E-Mails gefunden.\n\nMöchten Sie für diese Unternehmen einen Re-Crawl starten?`
    )

    if (!confirmed) return

    setRecrawling(true)
    try {
      const companyIds = companiesWithoutEmails.map((c) => c.id)
      const response = await fetch('/api/crawl/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_ids: companyIds,
          force: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Fehler beim Starten des Re-Crawls'
        const jobsCreated = errorData.jobs_created || 0
        const skipped = errorData.skipped || 0
        
        if (jobsCreated > 0 || skipped > 0) {
          alert(
            `⚠️ Teilweise erfolgreich:\n\n- ${jobsCreated} Jobs erstellt\n- ${skipped} übersprungen\n\nFehler: ${errorMessage}`
          )
        } else {
          throw new Error(errorMessage)
        }
        return
      }

      const result = await response.json()
      alert(
        `✅ Re-Crawl gestartet!\n\n- ${result.jobs_created || 0} Jobs erstellt\n- ${result.skipped || 0} übersprungen`
      )

      setTimeout(() => {
        fetchCompanies()
      }, 2000)
    } catch (error) {
      console.error('Re-Crawl error:', error)
      alert(`❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setRecrawling(false)
    }
  }

  const totalCompanies = companies.length
  const companiesWithEmails = companies.filter((c) => {
    const hasEmail = (c.owner_email && c.owner_email.trim() !== '') || (c.email && c.email.trim() !== '')
    const hasEmailCount = (c.email_count ?? 0) > 0
    return hasEmail || hasEmailCount
  }).length

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="mb-2">Unternehmen</h1>
            <p className="text-gray-600">
              {totalCompanies} {totalCompanies === 1 ? 'Unternehmen' : 'Unternehmen'} gesamt
              {companiesWithEmails > 0 && ` • ${companiesWithEmails} mit E-Mail-Adresse`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {someSelected && (
              <button
                onClick={exportToCsv}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4" />
                Als CSV exportieren
              </button>
            )}
            {companiesWithoutEmails.length > 0 && (
              <button
                onClick={handleRecrawlNoEmails}
                disabled={recrawling}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${recrawling ? 'animate-spin' : ''}`} />
                Re-Crawl ({companiesWithoutEmails.length})
              </button>
            )}
            <Link
              href="/search"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
            >
              <Building2 className="w-4 h-4" />
              Neue Suche
            </Link>
          </div>
        </div>

        {someSelected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-blue-900 font-medium">
                  {selectedCompanies.size} {selectedCompanies.size === 1 ? 'Unternehmen' : 'Unternehmen'} ausgewählt
                </p>
                {exportableCount > 0 && (
                  <p className="text-blue-700 text-sm mt-0.5">
                    {exportableCount} {exportableCount === 1 ? 'Unternehmen' : 'Unternehmen'} mit E-Mail-Adresse können exportiert werden
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3>Filter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoryFilter" className="block mb-2 text-gray-700 font-medium">
              Branche / Kategorie
            </label>
            <div className="relative">
              <select
                id="categoryFilter"
                value={selectedCategory || ''}
                onChange={(e) => {
                  const value = e.target.value || null
                  setSelectedCategory(value)
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none pr-10"
                disabled={categoriesLoading}
              >
                <option value="">Alle Kategorien</option>
                {availableCategories.map((cat) => (
                  <option key={cat.category_name} value={cat.category_name}>
                    {translateCategory(cat.category_name)}
                  </option>
                ))}
              </select>
              {categoriesLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="locationFilter" className="block mb-2 text-gray-700 font-medium">
              Standort
            </label>
            <div className="relative">
              <select
                id="locationFilter"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value)
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none pr-10"
                disabled={filtersLoading}
              >
                <option value="">Alle Standorte</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              {filtersLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Lädt Unternehmen...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-900 font-medium mb-1">Fehler beim Laden</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-1">Keine Unternehmen gefunden</p>
          <p className="text-gray-600 mb-6">
            {selectedCategory || locationFilter
              ? 'Versuchen Sie andere Filter-Optionen'
              : 'Starten Sie eine neue Suche, um Unternehmen zu finden'}
          </p>
          {(!selectedCategory && !locationFilter) && (
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
            >
              <Building2 className="w-4 h-4" />
              Neue Suche starten
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    {companies.length} {companies.length === 1 ? 'Unternehmen' : 'Unternehmen'}
                  </span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`px-6 py-5 hover:bg-gray-50 transition-colors ${
                    selectedCompanies.has(company.id) ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.has(company.id)}
                        onChange={() => handleSelectCompany(company.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900 font-semibold truncate">
                              {company.name}
                            </h3>
                            {(() => {
                              const ownerEmail = company.owner_email ? String(company.owner_email).trim() : ''
                              const companyEmail = company.email ? String(company.email).trim() : ''
                              const emailCount = Number(company.email_count) || 0
                              
                              const hasOwnerEmail = ownerEmail.length > 0 && ownerEmail !== 'null' && ownerEmail !== 'undefined'
                              const hasCompanyEmail = companyEmail.length > 0 && companyEmail !== 'null' && companyEmail !== 'undefined'
                              const hasEmailCount = emailCount > 0
                              const hasAnyEmail = hasOwnerEmail || hasCompanyEmail || hasEmailCount
                              
                              return hasAnyEmail ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
                                  <Mail className="w-3 h-3" />
                                  {hasEmailCount ? `${emailCount} E-Mail${emailCount > 1 ? 's' : ''}` : 'E-Mail'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                  <XCircle className="w-3 h-3" />
                                  Keine E-Mail
                                </span>
                              )
                            })()}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            {company.industry && (
                              <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                {company.industry}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {company.location}
                            </span>
                            {(company.email_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {company.email_count} {company.email_count === 1 ? 'E-Mail' : 'E-Mails'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {company.crawl_status && (
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                                company.crawl_status === 'done'
                                  ? 'bg-green-100 text-green-700'
                                  : company.crawl_status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : company.crawl_status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : company.crawl_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {company.crawl_status === 'done'
                                ? 'Abgeschlossen'
                                : company.crawl_status === 'running'
                                ? 'Läuft'
                                : company.crawl_status === 'failed'
                                ? 'Fehlgeschlagen'
                                : company.crawl_status === 'pending'
                                ? 'Wartend'
                                : company.crawl_status}
                            </span>
                          )}
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Website öffnen"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Link
                            href={`/companies/${company.id}`}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(company.created_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
