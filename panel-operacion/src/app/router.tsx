import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage, RequireAuth } from '../features/auth'
import { BoardRoute } from './BoardRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <BoardRoute />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
