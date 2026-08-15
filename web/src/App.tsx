import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginScreen } from './components/LoginScreen'
import { Layout } from './components/layout/Layout'
import { AuthProvider, useAuth, type AuthUser } from './context/AuthContext'
import { OrdersProvider } from './context/OrdersContext'
import { getAccessToken } from './lib/api/session'
import { CreateOrder } from './pages/CreateOrder'
import { MyTasks } from './pages/MyTasks'
import { OrderDetail } from './pages/OrderDetail'
import { OrdersList } from './pages/OrdersList'
import { ProductionPlanning } from './pages/ProductionPlanning'
import { useAppDispatch } from './store/hooks'
import { restoreSession } from './store/slices/authSlice'

function AuthGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const { isBootstrapping } = useAuth()

  useEffect(() => {
    if (getAccessToken()) {
      void dispatch(restoreSession())
    }
  }, [dispatch])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-muted">
        Restoring session…
      </div>
    )
  }

  return children
}

function ProtectedRoute({
  path,
  children,
}: {
  path: string
  children: ReactNode
}) {
  const { isAuthenticated, canAccess, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (!canAccess(path)) {
    return <Navigate to={user.defaultPath} replace />
  }

  return children
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  function handleLoginSuccess(nextUser: AuthUser) {
    navigate(nextUser.defaultPath, { replace: true })
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated && user ? (
            <Navigate to={user.defaultPath} replace />
          ) : (
            <LoginScreen onSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route
        element={
          isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
        }
      >
        <Route
          index
          element={<Navigate to={user?.defaultPath ?? '/orders'} replace />}
        />
        <Route
          path="/create-order"
          element={
            <ProtectedRoute path="/create-order">
              <CreateOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute path="/orders">
              <OrdersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute path="/orders">
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/production-planning"
          element={
            <ProtectedRoute path="/production-planning">
              <ProductionPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tasks"
          element={
            <ProtectedRoute path="/my-tasks">
              <MyTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={user?.defaultPath ?? '/login'} replace />}
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <OrdersProvider>
        <BrowserRouter>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </BrowserRouter>
      </OrdersProvider>
    </AuthProvider>
  )
}
