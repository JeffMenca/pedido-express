export type IconName = 'cash' | 'receipt' | 'flame' | 'bell' | 'chevron-left' | 'menu' | 'close' | 'logout' | 'check' | 'alert'

const PATHS: Record<IconName, string[]> = {
  cash: ['M3 7h18v10H3z', 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z', 'M6 10v4', 'M18 10v4'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 11l2 2 4-4'],
  flame: ['M12 3c.8 3.4 5 5.6 5 10.2a5 5 0 0 1-10 0c0-2.3 1-3.7 2.3-5 .3 1.6 1 2.6 2.2 2.9-.5-2.9-.2-5.5.5-8.1z'],
  bell: ['M4 18h16', 'M5.5 18a6.5 6.5 0 0 1 13 0', 'M12 11.5V9', 'M10 9h4'],
  'chevron-left': ['M14.5 6l-6 6 6 6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h10'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  logout: ['M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4', 'M10 16l-4-4 4-4', 'M6 12h10'],
  check: ['M6 12.5l4 4 8-9'],
  alert: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17h.01'],
}

type Props = { name: IconName; className?: string; strokeWidth?: number }

export function Icon({ name, className = 'size-5', strokeWidth = 1.75 }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
