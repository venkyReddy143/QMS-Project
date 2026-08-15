import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  fetchCustomersApi,
  fetchMachinesApi,
  fetchProcessStepsApi,
  fetchProductsApi,
} from '../../lib/api/masters'
import type {
  CustomerOption,
  MachineOption,
  ProcessStepOption,
  ProductOption,
} from '../../types/masters'

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface MastersState {
  customers: CustomerOption[]
  products: ProductOption[]
  processSteps: ProcessStepOption[]
  machines: MachineOption[]
  customersStatus: LoadStatus
  productsStatus: LoadStatus
  processStepsStatus: LoadStatus
  machinesStatus: LoadStatus
  customersError: string | null
  productsError: string | null
  processStepsError: string | null
  machinesError: string | null
}

const initialState: MastersState = {
  customers: [],
  products: [],
  processSteps: [],
  machines: [],
  customersStatus: 'idle',
  productsStatus: 'idle',
  processStepsStatus: 'idle',
  machinesStatus: 'idle',
  customersError: null,
  productsError: null,
  processStepsError: null,
  machinesError: null,
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

export const fetchProcessSteps = createAsyncThunk(
  'masters/fetchProcessSteps',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchProcessStepsApi()
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load process steps.')
      }
      return response.processSteps
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load process steps.',
      )
    }
  },
)

export const fetchMachines = createAsyncThunk(
  'masters/fetchMachines',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchMachinesApi()
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load machines.')
      }
      return response.machines
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load machines.',
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
      .addCase(fetchProcessSteps.pending, (state) => {
        state.processStepsStatus = 'loading'
        state.processStepsError = null
      })
      .addCase(fetchProcessSteps.fulfilled, (state, action) => {
        state.processStepsStatus = 'succeeded'
        state.processSteps = action.payload
      })
      .addCase(fetchProcessSteps.rejected, (state, action) => {
        state.processStepsStatus = 'failed'
        state.processStepsError =
          (action.payload as string) || 'Failed to load process steps.'
      })
      .addCase(fetchMachines.pending, (state) => {
        state.machinesStatus = 'loading'
        state.machinesError = null
      })
      .addCase(fetchMachines.fulfilled, (state, action) => {
        state.machinesStatus = 'succeeded'
        state.machines = action.payload
      })
      .addCase(fetchMachines.rejected, (state, action) => {
        state.machinesStatus = 'failed'
        state.machinesError =
          (action.payload as string) || 'Failed to load machines.'
      })
  },
})

export const mastersReducer = mastersSlice.reducer
