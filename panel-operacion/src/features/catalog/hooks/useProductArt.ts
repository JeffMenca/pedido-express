import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '../../../shared/lib/queryKeys'
import { fetchMenu } from '../api/menu'
import { buildArtIndex, normalizeName, UNKNOWN_ART, type ProductArt } from './productArt'

export function useProductArt(name: string): ProductArt & { loading: boolean } {
  const query = useQuery({
    queryKey: queryKeys.menu,
    queryFn: ({ signal }) => fetchMenu(signal),
    staleTime: Infinity,
    gcTime: Infinity,
  })
  const index = useMemo(() => (query.data ? buildArtIndex(query.data) : null), [query.data])
  const art = index?.get(normalizeName(name)) ?? UNKNOWN_ART
  return { ...art, loading: query.isPending }
}
