import type { Session } from '../api/login'

const KEY = 'pedido-express.session'

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Session).accessToken === 'string' &&
      typeof (parsed as Session).user?.role === 'string'
    ) {
      return parsed as Session
    }
    return null
  } catch {
    return null
  }
}

export function writeSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session))
    else sessionStorage.removeItem(KEY)
  } catch {
    // Storage can be unavailable (private mode); the in-memory session still works.
  }
}
