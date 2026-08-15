import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchCustomersApi, fetchProductsApi } from '../../lib/api/masters'
import type { CustomerOption, ProductOption } from '../../types/masters'

interface MastersState {
  customers: CustomerOption[]
  products: ProductOption[]
  customersStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  productsStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  customersError: string | null
  productsError: string | null
}

const initialState: MastersState = {
  customers: [],
  products: [],
  customersStatus: 'idle',
  productsStatus: 'idle',
  customersError: null,
  productsError: null,
}

export const fetchCustomers = createAsyncThunk(
  'masters/fetchCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchCustomersApi()
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load customers.')
      }
      return response.customers
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load customers.',
      )
    }
  },
)

export const fetchProducts = createAsyncThunk(
  'masters/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchProductsApi()
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load products.')
      }
      return response.products
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load products.',
      )
    }
  },
)

const mastersSlice = createSlice({
  name: 'masters',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.customersStatus = 'loading'
        state.customersError = null
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.customersStatus = 'succeeded'
        state.customers = action.payload
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.customersStatus = 'failed'
        state.customersError =
          (action.payload as string) || 'Failed to load customers.'
      })
      .addCase(fetchProducts.pending, (state) => {
        state.productsStatus = 'loading'
        state.productsError = null
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.productsStatus = 'succeeded'
        state.products = action.payload
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.productsStatus = 'failed'
        state.productsError =
          (action.payload as string) || 'Failed to load products.'
      })
  },
})

export const mastersReducer = mastersSlice.reducer
