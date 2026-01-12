'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Mail, Phone, MapPin, Building2, Search, RefreshCw, Star, Map, Globe, User, Award } from 'lucide-react'
import { translateCategory } from '@/lib/utils/categoryTranslations'

interface Company {
  id: string
  name: string
  industry: string
  location: string
  website: string | null
  description: string | null
  email: string | null
  phone: string | null
  status: string
  created_at: string
  updated_at: string
  owner_first_name?: string | null
  owner_last_name?: string | null
  owner_email?: string | null
  owner_title?: string | null
  dataforseo_category_ids?: string[] | null
  dataforseo_city?: string | null
  dataforseo_zip?: string | null
  dataforseo_country_code?: string | null
  dataforseo_latitude?: number | null
  dataforseo_longitude?: number | null
  dataforseo_rating_value?: number | null
  dataforseo_rating_votes_count?: number | null
  dataforseo_price_level?: string | null
  dataforseo_is_claimed?: boolean | null
  dataforseo_logo?: string | null
  dataforseo_main_image?: string | null
  dataforseo_place_id?: string | null
  dataforseo_cid?: string | null
  dataforseo_enrichment_status?: string | null
  crawl_status?: {
    status: string
    finished_at: string | null
    last_error: string | null
  } | null
  emails?: Array<{
    id: string
    email: string
    source_url: string
    confidence_score: number
    created_at: string
  }>
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [crawling, setCrawling] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [params.id])

  const fetchCompany = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${params.id}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Unternehmen nicht gefunden')
        }
        throw new Error('Fehler beim Laden des Unternehmens')
      }

      const { data } = await response.json()
      setCompany(data)
      setCrawling(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleStartCrawl = async (force: boolean = false) => {
    if (!company) return
    
    setCrawling(true)
    try {
      const response = await fetch('/api/crawl/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          force,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          alert(`Job bereits vorhanden: ${errorData.error}`)
        } else {
          alert(`Fehler: ${errorData.error || 'Unbekannter Fehler'}`)
        }
      } else {
        alert('Crawl-Job erfolgreich erstellt')
        fetchCompany()
      }
    } catch (err) {
      console.error('Crawl error:', err)
      alert('Fehler beim Erstellen des Crawl-Jobs')
    } finally {
      setCrawling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-600">Lädt...</p>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 rounded-xl border border-red-100 p-6">
          <p className="text-red-700">{error || 'Unternehmen nicht gefunden'}</p>
          <Link
            href="/companies"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Zurück zur Liste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/companies"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Zurück zur Liste</span>
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="mb-2">{company.name}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                {company.industry}
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                {company.status}
              </span>
              {company.crawl_status && (
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    company.crawl_status.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : company.crawl_status.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : company.crawl_status.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : company.crawl_status.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Crawl: {company.crawl_status.status}
                </span>
              )}
            </div>
          </div>
          {company.website && (
            <div className="flex gap-2">
              <button
                onClick={() => handleStartCrawl(false)}
                disabled={crawling}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                {crawling ? 'Wird erstellt...' : 'Start Crawl'}
              </button>
              <button
                onClick={() => handleStartCrawl(true)}
                disabled={crawling}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Force Recrawl (ignoriert Deduplizierung)"
              >
                <RefreshCw className="w-4 h-4" />
                Force Recrawl
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-4">Kontaktinformationen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.location && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-500">Standort</p>
                    <p className="text-gray-900">{company.location}</p>
                  </div>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-500">Website</p>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {company.website}
                    </a>
                  </div>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-500">E-Mail</p>
                    <a
                      href={`mailto:${company.email}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-500">Telefon</p>
                    <a
                      href={`tel:${company.phone}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {company.description && (
            <div>
              <h3 className="mb-4">Beschreibung</h3>
              <p className="text-gray-600">{company.description}</p>
            </div>
          )}

          {(company.owner_first_name || company.owner_last_name || company.owner_email || company.owner_title) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Geschäftsführer / Kontaktperson
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(company.owner_first_name || company.owner_last_name) && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-500">Name</p>
                      <p className="text-gray-900">
                        {[company.owner_first_name, company.owner_last_name].filter(Boolean).join(' ') || '-'}
                      </p>
                    </div>
                  </div>
                )}
                {company.owner_title && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-500">Position</p>
                      <p className="text-gray-900">{company.owner_title}</p>
                    </div>
                  </div>
                )}
                {company.owner_email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-500">E-Mail</p>
                      <a
                        href={`mailto:${company.owner_email}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {company.owner_email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(company.dataforseo_category_ids && company.dataforseo_category_ids.length > 0) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Kategorien
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.dataforseo_category_ids.map((catId) => (
                  <span
                    key={catId}
                    className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm"
                  >
                    {translateCategory(catId)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(company.dataforseo_rating_value || company.dataforseo_rating_votes_count || company.dataforseo_price_level) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Bewertungen & Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {company.dataforseo_rating_value && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-gray-500">Bewertung</p>
                      <p className="text-gray-900">
                        {company.dataforseo_rating_value.toFixed(1)} ⭐
                        {company.dataforseo_rating_votes_count && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({company.dataforseo_rating_votes_count} Bewertungen)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {company.dataforseo_price_level && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold">€</span>
                    </div>
                    <div>
                      <p className="text-gray-500">Preisniveau</p>
                      <p className="text-gray-900">{company.dataforseo_price_level}</p>
                    </div>
                  </div>
                )}
                {company.dataforseo_is_claimed !== null && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-500">Verifiziert</p>
                      <p className="text-gray-900">
                        {company.dataforseo_is_claimed ? 'Ja' : 'Nein'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(company.dataforseo_latitude && company.dataforseo_longitude) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Map className="w-5 h-5" />
                Standort (Koordinaten)
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-500">GPS-Koordinaten</p>
                  <a
                    href={`https://www.google.com/maps?q=${company.dataforseo_latitude},${company.dataforseo_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {company.dataforseo_latitude}, {company.dataforseo_longitude}
                  </a>
                </div>
              </div>
            </div>
          )}

          {(company.dataforseo_city || company.dataforseo_zip || company.dataforseo_country_code) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Adressdetails
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {company.dataforseo_city && (
                  <div>
                    <p className="text-gray-500">Stadt</p>
                    <p className="text-gray-900">{company.dataforseo_city}</p>
                  </div>
                )}
                {company.dataforseo_zip && (
                  <div>
                    <p className="text-gray-500">PLZ</p>
                    <p className="text-gray-900">{company.dataforseo_zip}</p>
                  </div>
                )}
                {company.dataforseo_country_code && (
                  <div>
                    <p className="text-gray-500">Land</p>
                    <p className="text-gray-900">{company.dataforseo_country_code}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(company.dataforseo_logo || company.dataforseo_main_image) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Bilder
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company.dataforseo_logo && (
                  <div>
                    <p className="text-gray-500 mb-2">Logo</p>
                    <img
                      src={company.dataforseo_logo}
                      alt={`${company.name} Logo`}
                      className="max-w-32 max-h-32 object-contain rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                {company.dataforseo_main_image && (
                  <div>
                    <p className="text-gray-500 mb-2">Hauptbild</p>
                    <img
                      src={company.dataforseo_main_image}
                      alt={`${company.name}`}
                      className="max-w-full max-h-64 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {(company.dataforseo_place_id || company.dataforseo_cid) && (
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                DataForSEO IDs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {company.dataforseo_place_id && (
                  <div>
                    <p className="text-gray-500">Place ID</p>
                    <p className="text-gray-900 font-mono">{company.dataforseo_place_id}</p>
                  </div>
                )}
                {company.dataforseo_cid && (
                  <div>
                    <p className="text-gray-500">CID</p>
                    <p className="text-gray-900 font-mono">{company.dataforseo_cid}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {company.dataforseo_enrichment_status && (
            <div>
              <h3 className="mb-4">Enrichment-Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">DataForSEO</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      company.dataforseo_enrichment_status === 'enriched'
                        ? 'bg-green-100 text-green-700'
                        : company.dataforseo_enrichment_status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : company.dataforseo_enrichment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {company.dataforseo_enrichment_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {company.emails && company.emails.length > 0 && (
            <div>
              <h3 className="mb-4">Gefundene E-Mails ({company.emails.length})</h3>
              <div className="space-y-2">
                {company.emails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <a
                          href={`mailto:${email.email}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {email.email}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Quelle: {email.source_url} • Confidence: {email.confidence_score}%
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        email.confidence_score >= 90
                          ? 'bg-green-100 text-green-700'
                          : email.confidence_score >= 70
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {email.confidence_score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {company.crawl_status?.last_error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">
                <strong>Fehler:</strong> {company.crawl_status.last_error}
              </p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="text-gray-500">Erstellt am</p>
                <p>{new Date(company.created_at).toLocaleString('de-DE')}</p>
              </div>
              <div>
                <p className="text-gray-500">Aktualisiert am</p>
                <p>{new Date(company.updated_at).toLocaleString('de-DE')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

