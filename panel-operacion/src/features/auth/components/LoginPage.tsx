import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { EASE_OUT_QUART } from '../../../shared/lib/motion'
import { Button } from '../../../shared/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useLogin } from '../hooks/useLogin'

const inputClass =
  'mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-stone-900 focus:border-[#C2410C] focus:outline-2 focus:outline-offset-0 focus:outline-[#C2410C]/30'

export function LoginPage() {
  const { session } = useAuth()
  const loginMutation = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (session) return <Navigate to="/" replace />

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    loginMutation.mutate({ username: username.trim(), password })
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-stone-50 px-4">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE_OUT_QUART }}
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6"
      >
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Pedido Express</h1>
        <p className="mt-1 text-sm text-stone-600">Panel de operación. Ingresa con tu usuario de estación.</p>

        <label className="mt-6 block text-sm font-medium text-stone-700">
          Usuario
          <input
            className={inputClass}
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-stone-700">
          Contraseña
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {loginMutation.isError && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {errorMessage(loginMutation.error)}
          </p>
        )}

        <Button type="submit" className="mt-6 w-full" pending={loginMutation.isPending}>
          {loginMutation.isPending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </motion.form>
    </main>
  )
}
