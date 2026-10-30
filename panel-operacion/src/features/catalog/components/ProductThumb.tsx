import { illustrationUrl } from '../../../shared/lib/illustrations'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { useProductArt } from '../hooks/useProductArt'

type Props = { name: string; size?: number; className?: string }

/** The product illustration on its category tint; decorative because the name is always printed beside it. */
export function ProductThumb({ name, size = 36, className = '' }: Props) {
  const art = useProductArt(name)
  const style = { width: size, height: size }
  if (art.loading) {
    return (
      <span style={style} className={`shrink-0 ${className}`}>
        <Skeleton className="size-full rounded-control" />
      </span>
    )
  }

  const url = illustrationUrl(art.sku)
  return (
    <span
      aria-hidden="true"
      style={{ ...style, backgroundColor: art.tint }}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-control ${className}`}
    >
      {url && <img src={url} alt="" draggable={false} className="size-[88%] object-contain" />}
    </span>
  )
}
