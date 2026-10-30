import { motion } from 'framer-motion'

export default function App() {
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-50 text-stone-900">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="text-2xl font-semibold tracking-tight"
      >
        Pedido Express · Panel de operación
      </motion.h1>
    </main>
  )
}
