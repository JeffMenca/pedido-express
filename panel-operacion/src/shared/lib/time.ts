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

/** Wall-clock time that re-renders on each minute boundary, not on a fixed interval. */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let id: number
    const schedule = () => {
      const current = new Date()
      const msToNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds())
      id = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, msToNextMinute + 20)
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [])
  return now
}

export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
