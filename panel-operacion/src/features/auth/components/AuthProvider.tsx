import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { configureHttp } from '../../../shared/http/client'
import type { Session } from '../api/login'
import { readSession, writeSession } from '../hooks/sessionStore'
import { AuthContext } from '../hooks/useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(readSession)
  const tokenRef = useRef<string | null>(session?.accessToken ?? null)

  const signIn = useCallback((next: Session) => {
    tokenRef.current = next.accessToken
    writeSession(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    tokenRef.current = null
    writeSession(null)
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  // Configured during render so the very first board request already carries the token.
  configureHttp({ getToken: () => tokenRef.current, onUnauthorized: signOut })

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
