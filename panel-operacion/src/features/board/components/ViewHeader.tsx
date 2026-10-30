type Props = { title: string; hint: string; count: number | undefined }

export function ViewHeader({ title, hint, count }: Props) {
  return (
    <header className="flex items-end justify-between gap-6">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-none font-extrabold tracking-tight text-ink sm:text-[40px]">
          {title}
        </h1>
        <p className="mt-3 text-base text-humo">{hint}</p>
      </div>
      <p className="shrink-0 text-right" aria-live="off">
        <span className="block font-mono text-[28px] leading-none font-bold tabular-nums text-ink">
          {count ?? '–'}
        </span>
        <span className="mt-1 block text-xs text-humo">{count === 1 ? 'orden' : 'órdenes'}</span>
      </p>
    </header>
  )
}
