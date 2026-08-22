import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  createOrderApi,
  fetchOrderApi,
  fetchOrdersApi,
  updateOrderPlanningApi,
} from '../../lib/api/orders'
import type {
  CreateOrderPayload,
  ProductionOrder,
  UpdateOrderPlanningPayload,
} from '../../types/orders'

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface OrdersState {
  items: ProductionOrder[]
  listStatus: LoadStatus
  listError: string | null
  current: ProductionOrder | null
  detailStatus: LoadStatus
  detailError: string | null
  createStatus: LoadStatus
  createError: string | null
  lastCreated: ProductionOrder | null
  planningStatus: LoadStatus
  planningError: string | null
}

const initialState: OrdersState = {
  items: [],
  listStatus: 'idle',
  listError: null,
  current: null,
  detailStatus: 'idle',
  detailError: null,
  createStatus: 'idle',
  createError: null,
  lastCreated: null,
  planningStatus: 'idle',
  planningError: null,
}

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchOrdersApi()
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load orders.')
      }
      return response.orders
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load orders.',
      )
    }
  },
)

export const fetchOrder = createAsyncThunk(
  'orders/fetchOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await fetchOrderApi(orderId)
      if (!response.success || !response.order) {
        return rejectWithValue(response.message || 'Order not found.')
      }
      return response.order
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load order.',
      )
    }
  },
)

export const updateOrderPlanning = createAsyncThunk(
  'orders/updateOrderPlanning',
  async (
    input: { orderId: string; payload: UpdateOrderPlanningPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await updateOrderPlanningApi(input.orderId, input.payload)
      if (!response.success || !response.order) {
        return rejectWithValue(response.message || 'Failed to save order details.')
      }
      return response.order
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to save order details.',
      )
    }
  },
)

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
    clearOrderDetail(state) {
      state.current = null
      state.detailStatus = 'idle'
      state.detailError = null
      state.planningStatus = 'idle'
      state.planningError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.listStatus = 'loading'
        state.listError = null
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.listStatus = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.listStatus = 'failed'
        state.listError = (action.payload as string) || 'Failed to load orders.'
      })
      .addCase(fetchOrder.pending, (state) => {
        state.detailStatus = 'loading'
        state.detailError = null
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.current = null
        state.detailError = (action.payload as string) || 'Order not found.'
      })
      .addCase(createOrder.pending, (state) => {
        state.createStatus = 'loading'
        state.createError = null
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.createStatus = 'succeeded'
        state.lastCreated = action.payload
        state.createError = null
        const exists = state.items.some((item) => item.id === action.payload.id)
        if (!exists) {
          state.items = [action.payload, ...state.items]
        }
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.createStatus = 'failed'
        state.createError =
          (action.payload as string) || 'Failed to create order.'
      })
      .addCase(updateOrderPlanning.pending, (state) => {
        state.planningStatus = 'loading'
        state.planningError = null
      })
      .addCase(updateOrderPlanning.fulfilled, (state, action) => {
        state.planningStatus = 'succeeded'
        state.planningError = null
        state.current = action.payload
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index >= 0) {
          state.items[index] = action.payload
        }
      })
      .addCase(updateOrderPlanning.rejected, (state, action) => {
        state.planningStatus = 'failed'
        state.planningError =
          (action.payload as string) || 'Failed to save order details.'
      })
  },
})

export const { clearCreateOrderState, clearOrderDetail } = ordersSlice.actions
export const ordersReducer = ordersSlice.reducer
