'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getLastParked, getParkingHistory } from '../lib/parkingStorage'

function formatTimeAgo(iso: string): string {
  try {
    const then = new Date(iso)
    const diffMs = Date.now() - then.getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

function mapsUrls(lat: number, lng: number, address: string): { google: string; apple: string } {
  const encoded = address ? encodeURIComponent(address) : `${lat},${lng}`
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    apple: `https://maps.apple.com/?q=${encoded}`,
  }
}

export default function ParkingHistory() {
  const { isLoaded, isSignedIn, user } = useUser()
  const userId = user?.id

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [lastPointer, setLastPointer] = useState<any>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!isLoaded || !isSignedIn || !userId) return
      setLoading(true)
      setError(null)
      try {
        const [{ items: history }, lp] = await Promise.all([
          getParkingHistory(userId, 50, null),
          getLastParked(userId, { resolveHistory: false }),
        ])
        if (!active) return
        setItems(history)
        setLastPointer(lp)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Failed to load history')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, userId])

  const lastEntryId = lastPointer?.entryId || null

  if (!isLoaded) return null
  if (!isSignedIn) {
    return (
      <div className="rounded-lg border border-blue-200/50 dark:border-blue-800/50 bg-white/50 dark:bg-gray-900/40 p-4 text-sm">
        <p className="text-gray-700 dark:text-gray-300">
          Sign in to sync and view your parking history across devices.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/40 p-4 text-sm">
        Loading history...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200/50 dark:border-red-800/50 bg-red-50/60 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    )
  }

  if (!items?.length) {
    return (
      <div className="rounded-lg border border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/40 p-4 text-sm text-gray-700 dark:text-gray-300">
        No parking history yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const isLast = it.id === lastEntryId
        const urls = mapsUrls(it.lat, it.lng, it.address || '')
        return (
          <div
            key={it.id}
            className={`rounded-lg border p-3 ${
              isLast
                ? 'border-emerald-500/50 bg-emerald-50/60 dark:border-emerald-700/60 dark:bg-emerald-900/10'
                : 'border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 break-words">
                  {it.address || `${it.lat.toFixed(6)}, ${it.lng.toFixed(6)}`}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Parked {formatTimeAgo(it.savedAtISO)}{isLast ? ' • Last parked' : ''}
                </div>
                {it.note ? (
                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 break-words">
                    {it.note}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <a
                  href={urls.google}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Google
                </a>
                <a
                  href={urls.apple}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-black"
                >
                  Apple
                </a>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


