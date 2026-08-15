import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { fetchCurrentUserApi, loginApi } from '../../lib/api/auth'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../../lib/api/session'
import {
  mapApiUser,
  type AuthUser,
  type LoginRequest,
} from '../../types/auth'

interface AuthState {
  status: 'bootstrapping' | 'ready'
  user: AuthUser | null
  error: string | null
}

const initialState: AuthState = {
  status: getAccessToken() ? 'bootstrapping' : 'ready',
  user: null,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const phone = credentials.phone.replace(/\D/g, '').slice(-10)
      const response = await loginApi({
        phone,
        password: credentials.password,
      })

      if (!response.success || !response.token || !response.user) {
        return rejectWithValue(response.message || 'Login failed.')
      }

      setAccessToken(response.token)
      return mapApiUser(response.user)
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Login failed.',
      )
    }
  },
)

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    const token = getAccessToken()
    if (!token) {
      return rejectWithValue('No session.')
    }

    try {
      const response = await fetchCurrentUserApi()
      if (!response.success || !response.user) {
        clearAccessToken()
        return rejectWithValue('Session expired.')
      }
      return mapApiUser(response.user)
    } catch (error) {
      clearAccessToken()
      return rejectWithValue(
        error instanceof Error ? error.message : 'Session expired.',
      )
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearAccessToken()
      state.user = null
      state.error = null
      state.status = 'ready'
    },
    clearAuthError(state) {
      state.error = null
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.status = 'ready'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload
        state.error = null
        state.status = 'ready'
      })
      .addCase(login.rejected, (state, action) => {
        state.user = null
        state.error = (action.payload as string) || 'Login failed.'
        state.status = 'ready'
      })
      .addCase(restoreSession.pending, (state) => {
        state.status = 'bootstrapping'
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload
        state.error = null
        state.status = 'ready'
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null
        state.status = 'ready'
      })
  },
})

export const { logout, clearAuthError, setUser } = authSlice.actions
export const authReducer = authSlice.reducer
