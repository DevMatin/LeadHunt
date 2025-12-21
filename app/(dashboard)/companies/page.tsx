'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Download } from 'lucide-react'

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

export default function CompaniesPage() {
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [industryFilter, setIndustryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [industries, setIndustries] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchFilters()
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchCompanies()
    setSelectedCompanies(new Set())
  }, [industryFilter, locationFilter, searchParams])

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
      if (industryFilter) params.append('industry', industryFilter)
      if (locationFilter) params.append('location', locationFilter)

      const response = await fetch(`/api/companies?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Unternehmen')
      }

      const { data } = await response.json()
      const companiesData = (data || []).map((company: any) => ({
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
        email_count: company.email_count || 0,
      }))
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Unternehmen</h1>
          {someSelected && (
            <p className="text-sm text-gray-600 mt-1">
              {selectedCompanies.size} ausgewählt
              {exportableCount > 0 && ` • ${exportableCount} mit E-Mail`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {someSelected && (
            <button
              onClick={exportToCsv}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Als CSV exportieren
            </button>
          )}
          <Link
            href="/search"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Neue Suche
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="industryFilter" className="block mb-2 text-gray-700">
              Branche filtern
            </label>
            <select
              id="industryFilter"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={filtersLoading}
            >
              <option value="">Alle Branchen</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="locationFilter" className="block mb-2 text-gray-700">
              Standort filtern
            </label>
            <select
              id="locationFilter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={filtersLoading}
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
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600">Lädt...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl border border-red-100 p-6">
          <p className="text-red-700">{error}</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600">Keine Unternehmen gefunden.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-gray-700 w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left p-4 text-gray-700">Name</th>
                  <th className="text-left p-4 text-gray-700">Branche</th>
                  <th className="text-left p-4 text-gray-700">Standort</th>
                  <th className="text-left p-4 text-gray-700">Website</th>
                  <th className="text-left p-4 text-gray-700">Crawl Status</th>
                  <th className="text-left p-4 text-gray-700">E-Mails</th>
                  <th className="text-left p-4 text-gray-700">Erstellt am</th>
                  <th className="text-left p-4 text-gray-700">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.has(company.id)}
                        onChange={() => handleSelectCompany(company.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4">
                      <p className="text-gray-900">{company.name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-600">{company.industry}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-600">{company.location}</p>
                    </td>
                    <td className="p-4">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <span>Website</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {company.crawl_status ? (
                        <span
                          className={`px-2 py-1 rounded text-xs ${
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
                          {company.crawl_status}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600">
                        {(company.email_count ?? 0) > 0 ? company.email_count : '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-600">
                        {new Date(company.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/companies/${company.id}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
