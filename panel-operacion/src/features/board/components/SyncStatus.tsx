type Props = { updatedAt: number; now: number; failing: boolean; fetching: boolean }

export function SyncStatus({ updatedAt, now, failing, fetching }: Props) {
  if (failing) {
    return <span className="text-sm text-red-700">Sin conexión con la API · reintentando</span>
  }
  if (!updatedAt) {
    return <span className="text-sm text-stone-500">{fetching ? 'Cargando…' : 'Sin datos'}</span>
  }
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000))
  return (
    <span className="text-sm tabular-nums text-stone-500" aria-live="off">
      Actualizado hace {seconds} s
    </span>
  )
}
