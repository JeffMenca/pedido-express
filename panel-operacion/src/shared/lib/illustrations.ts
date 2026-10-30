const modules = import.meta.glob<string>('../../assets/illustrations/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/, '')
}

const URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [basename(path), url]),
)

export const FALLBACK_KEY = 'fallback'

/** Looks up an illustration by key (SKU, modifier code or scene); unknown keys get the paper-bag fallback. */
export function resolveIllustration(urls: Readonly<Record<string, string>>, key: string | null | undefined): string {
  if (key && urls[key]) return urls[key]
  return urls[FALLBACK_KEY] ?? ''
}

export function illustrationUrl(key: string | null | undefined): string {
  return resolveIllustration(URLS, key)
}

export type SceneName = 'recibido' | 'pagado' | 'cocina' | 'lista' | 'entregado' | 'rechazado' | 'cancelado'

/** Scenes have no meaningful fallback, so a missing one renders nothing rather than the product bag. */
export function sceneUrl(scene: SceneName): string | null {
  return URLS[scene] ?? null
}
