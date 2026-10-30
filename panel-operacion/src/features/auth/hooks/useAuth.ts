import { createContext, useContext } from 'react'
import type { Session } from '../api/login'

export type AuthContextValue = {
  session: Session | null
  signIn: (session: Session) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
