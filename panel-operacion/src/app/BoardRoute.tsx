import { BoardPage } from '../features/board'
import { useAuth } from '../features/auth'

export function BoardRoute() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return <BoardPage username={session.user.username} role={session.user.role} onSignOut={signOut} />
}
