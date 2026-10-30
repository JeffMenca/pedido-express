import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function elapsedMinutes(fromIso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(fromIso)) / 60_000))
}

export function formatElapsed(fromIso: string, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
