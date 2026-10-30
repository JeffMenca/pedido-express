type Props = { className?: string; tone?: 'light' | 'dark' }

/** Shimmer block shaped like the content it stands in for; static under reduced motion. */
export function Skeleton({ className = '', tone = 'light' }: Props) {
  const radius = className.includes('rounded-') ? '' : 'rounded-md'
  return <span aria-hidden="true" className={`block ${tone === 'dark' ? 'shimmer-dark' : 'shimmer'} ${radius} ${className}`} />
}
