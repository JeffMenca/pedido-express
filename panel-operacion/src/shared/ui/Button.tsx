import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#C2410C] text-white hover:bg-orange-800 disabled:bg-stone-300 disabled:text-stone-500',
  secondary: 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 disabled:text-stone-400',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-stone-300 disabled:text-stone-500',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:text-stone-400',
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
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
