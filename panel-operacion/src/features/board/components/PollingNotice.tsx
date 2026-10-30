import { Icon } from '../../../shared/ui/Icon'

type Props = { cause: string; hasData: boolean; retrying: boolean; onRetry: () => void }

export function PollingNotice({ cause, hasData, retrying, onRetry }: Props) {
  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control border border-demora/30 bg-ticket py-2 pr-2 pl-4 text-sm"
    >
      <Icon name="alert" className="size-[18px] shrink-0 text-demora" />
      <p className="min-w-0 flex-1 text-ink">
        <span className="font-semibold">{hasData ? 'Mostrando la última lista recibida.' : 'No se pudieron cargar las órdenes.'}</span>{' '}
        <span className="text-humo">{cause}</span>
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="min-h-11 rounded-control px-3 font-semibold text-ink hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink disabled:text-humo"
      >
        {retrying ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  )
}
