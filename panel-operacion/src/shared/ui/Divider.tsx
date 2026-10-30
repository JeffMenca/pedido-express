export function Divider({ className = '' }: { className?: string }) {
  return <hr aria-hidden="true" className={`border-0 border-t border-dashed border-ink/20 ${className}`} />
}
