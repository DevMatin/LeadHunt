'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface Company {
  id: string
  name: string
  industry: string
  location: string
  website: string | null
  created_at: string
}

export default function CompaniesPage() {
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [industryFilter, setIndustryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [industryFilter, locationFilter, searchParams])

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
      setCompanies(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1>Unternehmen</h1>
        <Link
          href="/search"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Neue Suche
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="industryFilter" className="block mb-2 text-gray-700">
              Branche filtern
            </label>
            <input
              id="industryFilter"
              type="text"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Software"
            />
          </div>
          <div>
            <label htmlFor="locationFilter" className="block mb-2 text-gray-700">
              Standort filtern
            </label>
            <input
              id="locationFilter"
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Berlin"
            />
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
                  <th className="text-left p-4 text-gray-700">Name</th>
                  <th className="text-left p-4 text-gray-700">Branche</th>
                  <th className="text-left p-4 text-gray-700">Standort</th>
                  <th className="text-left p-4 text-gray-700">Website</th>
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
