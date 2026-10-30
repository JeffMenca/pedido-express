export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-stone-200/70 ${className}`} />
}
