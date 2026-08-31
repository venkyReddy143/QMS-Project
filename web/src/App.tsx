import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginScreen } from './components/LoginScreen'
import { Layout } from './components/layout/Layout'
import { AuthProvider, useAuth, type AuthUser } from './context/AuthContext'
import { OrdersProvider } from './context/OrdersContext'
import { getAccessToken } from './lib/api/session'
import { CreateOrder } from './pages/CreateOrder'
import { AdminMasters } from './pages/AdminMasters'
import { AdminUsers } from './pages/AdminUsers'
import { MyTasks } from './pages/MyTasks'
import { OrderDetail } from './pages/OrderDetail'
import { OrdersList } from './pages/OrdersList'
import { ProductionPlanning } from './pages/ProductionPlanning'
import { SuperAdminDashboard } from './pages/SuperAdminDashboard'
import { SuperAdminProduction } from './pages/SuperAdminProduction'
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
          path="/dashboard"
          element={
            <ProtectedRoute path="/dashboard">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute path="/admin/users">
              <Navigate to="/masters/workers" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/masters"
          element={
            <ProtectedRoute path="/admin/masters">
              <Navigate to="/masters/machines" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/products"
          element={
            <ProtectedRoute path="/masters/products">
              <AdminMasters section="products" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/machine-types"
          element={
            <ProtectedRoute path="/masters/machine-types">
              <AdminMasters section="machine-types" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/machines"
          element={
            <ProtectedRoute path="/masters/machines">
              <AdminMasters section="machines" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/calendars"
          element={
            <ProtectedRoute path="/masters/calendars">
              <AdminMasters section="calendars" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/workers"
          element={
            <ProtectedRoute path="/masters/workers">
              <AdminUsers title="Workers" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/process-steps"
          element={
            <ProtectedRoute path="/masters/process-steps">
              <AdminMasters section="process-steps" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/customers"
          element={
            <ProtectedRoute path="/masters/customers">
              <AdminMasters section="customers" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order/my-orders/active"
          element={
            <ProtectedRoute path="/order/my-orders/active">
              <OrdersList key="my-active" scope="mine" view="active" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order/my-orders/all"
          element={
            <ProtectedRoute path="/order/my-orders/all">
              <OrdersList key="my-all" scope="mine" view="all" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order/orders/active"
          element={
            <ProtectedRoute path="/order/orders/active">
              <OrdersList key="all-active" scope="all" view="active" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order/orders/all"
          element={
            <ProtectedRoute path="/order/orders/all">
              <OrdersList key="all-all" scope="all" view="all" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/production/my-production/:view"
          element={
            <ProtectedRoute path="/production/my-production">
              <SuperAdminProduction />
            </ProtectedRoute>
          }
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
