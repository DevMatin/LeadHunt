'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
              Branche
            </label>
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Software, Healthcare, Fintech"
            />
          </div>
          <div>
            <label htmlFor="location" className="block mb-2 text-gray-700">
              Standort
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Berlin, Germany"
            />
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
