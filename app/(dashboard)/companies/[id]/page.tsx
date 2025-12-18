'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Mail, Phone, MapPin, Building2 } from 'lucide-react'

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
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
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
            </div>
          </div>
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

