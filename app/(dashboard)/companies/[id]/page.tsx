'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Mail, Phone, MapPin, Building2, Search, RefreshCw } from 'lucide-react'

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

