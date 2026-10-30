import { LayoutGroup } from 'framer-motion'
import { useMemo } from 'react'
import type { Role } from '../../../shared/http/contract'
import { errorMessage } from '../../../shared/http/errors'
import { useNow } from '../../../shared/lib/time'
import { Button } from '../../../shared/ui/Button'
import { columnsForRole, groupByColumn } from '../hooks/columns'
import { useBoardOrders } from '../hooks/useBoardOrders'
import { BoardColumn } from './BoardColumn'
import { SyncStatus } from './SyncStatus'

const ROLE_LABEL: Record<Role, string> = { CAJERO: 'Caja', COCINA: 'Cocina', SUPERVISOR: 'Supervisor' }

type Props = { username: string; role: Role; onSignOut: () => void }

export function BoardPage({ username, role, onSignOut }: Props) {
  const columns = useMemo(() => columnsForRole(role), [role])
  const query = useBoardOrders(columns)
  const now = useNow(1000)
  const groups = useMemo(() => (query.data ? groupByColumn(query.data, columns) : null), [query.data, columns])

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Pedido Express · Operación</h1>
          <p className="text-sm text-stone-500">
            {ROLE_LABEL[role]} · {username}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SyncStatus
            updatedAt={query.dataUpdatedAt}
            now={now}
            failing={query.isError && query.data !== undefined}
            fetching={query.isFetching}
          />
          <Button variant="secondary" onClick={onSignOut}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        {query.isError && query.data === undefined ? (
          <div role="alert" className="mx-auto mt-16 max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center">
            <p className="font-medium text-stone-900">No se pudo cargar el tablero</p>
            <p className="mt-1 text-sm text-stone-600">{errorMessage(query.error)}</p>
            <Button className="mt-4" variant="secondary" onClick={() => void query.refetch()} pending={query.isFetching}>
              Reintentar
            </Button>
          </div>
        ) : (
          <LayoutGroup>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 260px), 1fr))` }}
            >
              {columns.map((column) => (
                <BoardColumn
                  key={column.status}
                  column={column}
                  orders={groups?.get(column.status)}
                  role={role}
                  now={now}
                />
              ))}
            </div>
          </LayoutGroup>
        )}
      </main>
    </div>
  )
}
