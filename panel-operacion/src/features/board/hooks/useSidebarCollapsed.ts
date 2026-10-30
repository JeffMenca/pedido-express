import { useCallback, useState } from 'react'

const KEY = 'pedido-express.sidebar-collapsed'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read)
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(KEY, next ? '1' : '0')
      } catch {
        // Storage can be blocked; the preference just won't survive a reload.
      }
      return next
    })
  }, [])
  return [collapsed, toggle]
}
