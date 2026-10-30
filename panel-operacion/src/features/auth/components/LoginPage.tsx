import { motion, useReducedMotion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { EASE_OUT_QUART } from '../../../shared/lib/motion'
import { BrandMark } from '../../../shared/ui/BrandMark'
import { Button } from '../../../shared/ui/Button'
import { Divider } from '../../../shared/ui/Divider'
import { useAuth } from '../hooks/useAuth'
import { useLogin } from '../hooks/useLogin'

const inputClass =
  'mt-1.5 block min-h-12 w-full rounded-control border border-ink/15 bg-ticket px-3 text-base font-normal text-ink focus:border-ink focus:outline-none'

export function LoginPage() {
  const { session } = useAuth()
  const loginMutation = useLogin()
  const reduceMotion = useReducedMotion()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (session) return <Navigate to="/" replace />

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    loginMutation.mutate({ username: username.trim(), password })
  }

  return (
    <main className="grid min-h-dvh bg-ink text-white lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:px-16 lg:py-14">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="font-display text-lg font-bold tracking-tight">Pedido Express</span>
        </div>
        <div className="max-w-lg">
          <h1 className="font-display text-[28px] leading-[1.05] font-extrabold tracking-tight sm:text-[40px]">
            Caja y cocina en el mismo riel.
          </h1>
          <p className="mt-4 text-base text-white/60">
            Cobra, prepara y entrega cada orden desde una sola pantalla que se actualiza sola.
          </p>
        </div>
        <p className="hidden font-mono text-xs text-white/40 lg:block">Panel de operación</p>
      </section>

      <section className="flex flex-col bg-steel px-4 pb-10 text-ink sm:px-10 lg:px-12">
        <div aria-hidden="true" className="mt-10 h-[3px] rounded-full bg-mostaza lg:mt-24" />
        <motion.form
          onSubmit={onSubmit}
          initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0% 0% 100% 0%)' }}
          animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)', transitionEnd: { clipPath: 'none' } }}
          transition={{ duration: 0.32, ease: EASE_OUT_QUART, delay: 0.08 }}
          className="mx-auto w-full max-w-sm [filter:drop-shadow(0_10px_18px_rgb(27_26_34/0.10))]"
        >
          <div className="ticket-perforated rounded-b-ticket bg-ticket px-6 pt-8 pb-6">
            <p className="font-mono text-xs font-semibold text-humo">Inicio de turno</p>
            <h2 className="mt-1 font-display text-[28px] leading-tight font-bold tracking-tight">Ingresa a tu estación</h2>

            <Divider className="mt-5" />

            <label className="mt-5 block text-sm font-semibold">
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
            <label className="mt-4 block text-sm font-semibold">
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
              <p role="alert" className="mt-4 text-sm text-salsa">
                {errorMessage(loginMutation.error)}
              </p>
            )}

            <Button type="submit" className="mt-6 w-full" pending={loginMutation.isPending}>
              {loginMutation.isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </div>
        </motion.form>
      </section>
    </main>
  )
}
