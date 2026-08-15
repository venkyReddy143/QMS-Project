import { configureStore } from '@reduxjs/toolkit'
import { onUnauthorized } from '../lib/api/client'
import { authReducer, logout } from './slices/authSlice'
import { mastersReducer } from './slices/mastersSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    masters: mastersReducer,
  },
})

onUnauthorized(() => {
  store.dispatch(logout())
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
