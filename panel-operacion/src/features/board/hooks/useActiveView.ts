import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Role } from '../../../shared/http/contract'
import { resolveView, VIEW_PARAM, type ViewDef } from './views'

/** Reads the view from `?vista=` and writes the resolved one back so a refresh lands on the same view. */
export function useActiveView(role: Role): ViewDef {
  const [params, setParams] = useSearchParams()
  const requested = params.get(VIEW_PARAM)
  const view = resolveView(role, requested)

  useEffect(() => {
    if (requested === view.slug) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(VIEW_PARAM, view.slug)
        return next
      },
      { replace: true },
    )
  }, [requested, view.slug, setParams])

  return view
}
