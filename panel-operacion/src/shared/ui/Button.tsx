import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'quiet'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-salsa text-white hover:bg-salsa-dark disabled:bg-ink/10 disabled:text-ink/40',
  secondary: 'bg-ticket text-ink border border-ink/15 hover:border-ink/40 disabled:text-ink/40',
  quiet: 'text-humo hover:bg-ink/5 hover:text-ink disabled:text-ink/30',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  pending?: boolean
}

export function Button({ variant = 'primary', pending = false, disabled, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex min-h-11 items-center justify-center press rounded-control px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
