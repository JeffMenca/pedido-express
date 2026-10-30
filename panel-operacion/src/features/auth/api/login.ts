import { http } from '../../../shared/http/client'
import type { SessionUser } from '../../../shared/http/contract'

export type Session = { accessToken: string; user: SessionUser }

export function login(username: string, password: string): Promise<Session> {
  return http<Session>('/auth/login', { method: 'POST', body: { username, password } })
}
