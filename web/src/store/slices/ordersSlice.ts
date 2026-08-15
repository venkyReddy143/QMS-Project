import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { createOrderApi } from '../../lib/api/orders'
import type { CreatedOrder, CreateOrderPayload } from '../../types/orders'

interface OrdersState {
  createStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  createError: string | null
  lastCreated: CreatedOrder | null
}

const initialState: OrdersState = {
  createStatus: 'idle',
  createError: null,
  lastCreated: null,
}

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (payload: CreateOrderPayload, { rejectWithValue }) => {
    try {
      const response = await createOrderApi(payload)
      if (!response.success || !response.order) {
        return rejectWithValue(response.message || 'Failed to create order.')
      }
      return response.order
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create order.',
      )
    }
  },
)

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCreateOrderState(state) {
      state.createStatus = 'idle'
      state.createError = null
      state.lastCreated = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.createStatus = 'loading'
        state.createError = null
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.createStatus = 'succeeded'
        state.lastCreated = action.payload
        state.createError = null
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.createStatus = 'failed'
        state.createError =
          (action.payload as string) || 'Failed to create order.'
      })
  },
})

export const { clearCreateOrderState } = ordersSlice.actions
export const ordersReducer = ordersSlice.reducer
