import { useMutation } from '@tanstack/react-query'
import { login } from '../api/login'
import { useAuth } from './useAuth'

export function useLogin() {
  const { signIn } = useAuth()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => login(username, password),
    onSuccess: signIn,
  })
}
