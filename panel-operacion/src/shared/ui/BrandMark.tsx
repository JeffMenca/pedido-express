/** A folded receipt stub in mostaza carrying the "PE" monogram. */
export function BrandMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-control bg-mostaza font-display text-[15px] font-extrabold leading-none tracking-tight text-ink ${className}`}
    >
      PE
    </span>
  )
}
