export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-ink/[0.07] ${className}`} />
}
