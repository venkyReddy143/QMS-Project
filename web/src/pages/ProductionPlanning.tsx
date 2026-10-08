import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/Toast'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckSquare,
  Clock,
  Eye,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wrench,
  X,
} from 'lucide-react'
import { fetchAllBatchesApi, updateBatchSerialsApi } from '../lib/api/batches'
import { fetchAdminUsersApi } from '../lib/api/admin'
import { fetchPlanningOptionsApi, fetchPlansApi } from '../lib/api/planning'
import { SearchableSelect, type SelectOption } from '../components/SearchableSelect'
import type { ProductionBatch } from '../types/orders'
import type { PlanningOptions, ProductionPlan } from '../types/planning'

export type ShiftTab = 'VIEW' | 'WORK_UPDATE' | 'TOOL_CHANGE' | 'BREAKDOWN'

export interface UserOptionItem {
  id: string
  name: string
  employeeCode?: string
  role?: string
}

export function todayIso(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface SerialRecordItem {
  id: string
  serialNumber: string
  batchNo: string
  productName: string
  productCode: string
  processName: string
  processStepName: string
  shift: string
  status: string
  completedPercent: number
  comments: string
  orderId?: string
  batchId?: string
  operatorName?: string
  operatorId?: string
  date?: string
  planNo?: string
}

export interface CompletedSerialRecord extends SerialRecordItem {
  completedAt: string
  completedBy?: string
}

export interface StoredSerialUpdate {
  serialNumber: string
  completedPercent: number
  status: string
  comments?: string
  shift?: string
  operatorName?: string
  planNo?: string
  batchNo?: string
  productName?: string
  processStepName?: string
  date?: string
  orderId?: string
  batchId?: string
  updatedAt: string
}

export function getStoredSerialUpdates(): Record<string, StoredSerialUpdate> {
  try {
    const raw = localStorage.getItem('qms_serial_updates')
    const parsed: Record<string, StoredSerialUpdate> = raw ? JSON.parse(raw) : {}

    // Check completed records to not re-seed if already marked 100% completed
    let isCompleted05 = false
    let isCompleted06 = false
    try {
      const compRaw = localStorage.getItem('qms_completed_serial_records')
      if (compRaw) {
        const compList: any[] = JSON.parse(compRaw)
        isCompleted05 = compList.some(
          (c) =>
            c.serialNumber === 'TB-HP-2026-0002-B02-0005' && (c.completedPercent ?? 0) >= 100,
        )
        isCompleted06 = compList.some(
          (c) =>
            c.serialNumber === 'TB-HP-2026-0002-B02-0006' && (c.completedPercent ?? 0) >= 100,
        )
      }
    } catch {}

    const seededRaw = localStorage.getItem('qms_seed_initialized_50')
    if (!seededRaw) {
      if (!isCompleted05 && !parsed['TB-HP-2026-0002-B02-0005']) {
        parsed['TB-HP-2026-0002-B02-0005'] = {
          serialNumber: 'TB-HP-2026-0002-B02-0005',
          completedPercent: 50,
          status: 'IN_PROGRESS',
          comments: 'Machining in progress (50% completed)',
          batchNo: 'B02',
          updatedAt: new Date().toISOString(),
        }
      }
      if (!isCompleted06 && !parsed['TB-HP-2026-0002-B02-0006']) {
        parsed['TB-HP-2026-0002-B02-0006'] = {
          serialNumber: 'TB-HP-2026-0002-B02-0006',
          completedPercent: 50,
          status: 'IN_PROGRESS',
          comments: 'Machining in progress (50% completed)',
          batchNo: 'B02',
          updatedAt: new Date().toISOString(),
        }
      }
      try {
        localStorage.setItem('qms_serial_updates', JSON.stringify(parsed))
        localStorage.setItem('qms_seed_initialized_50', 'true')
      } catch {}
    }

    return parsed
  } catch {
    return {}
  }
}

export function saveStoredSerialUpdate(update: StoredSerialUpdate) {
  try {
    const all = getStoredSerialUpdates()
    all[update.serialNumber] = update
    localStorage.setItem('qms_serial_updates', JSON.stringify(all))
  } catch {}
}

export function removeStoredSerialUpdate(serialNumber: string) {
  try {
    const all = getStoredSerialUpdates()
    delete all[serialNumber]
    localStorage.setItem('qms_serial_updates', JSON.stringify(all))
  } catch {}
}

export interface ToolChangeRecord {
  id: string
  toolCode: string
  toolName: string
  machineCode: string
  planNo?: string
  batchNo?: string
  processStepName?: string
  shift: string
  date: string
  operatorName?: string
  startTime: string
  endTime: string
  duration: string
  remarks: string
  status: string
  loggedAt: string
}

export interface BreakdownRecord {
  id: string
  machineCode: string
  category: string
  planNo?: string
  batchNo?: string
  shift: string
  date: string
  operatorName?: string
  startTime: string
  endTime: string
  duration: string
  reason: string
  status: string
  loggedAt: string
}

export const ASSIGNED_TOOLS = [
  { code: 'T-01', name: 'Carbide End Mill Ø12mm (Roughing)' },
  { code: 'T-02', name: 'Ball Nose Cutter Ø8mm (Contour Finishing)' },
  { code: 'T-03', name: 'Face Mill Ø50mm (4-Flute Facing)' },
  { code: 'T-04', name: 'Solid Carbide Drill Ø6.8mm (Pre-drill)' },
  { code: 'T-05', name: 'Threading Tap M8x1.25' },
  { code: 'T-06', name: 'Chamfer Mill 45° Ø10mm (Edge Prep)' },
  { code: 'T-07', name: 'Indexable Turning Insert CNMG 120408' },
  { code: 'T-08', name: 'Boring Bar Ø20mm (Internal Turning)' },
]

export const BREAKDOWN_CATEGORIES = [
  'Spindle Overheat / Chiller Line Issue',
  'Hydraulic Pressure Drop',
  'Coolant Low Flow / Pump Blockage',
  'Axis Servo Overload (X/Y/Z)',
  'Pneumatic Chuck Jam',
  'Electrical Tripping / Drive Error',
  'Tool Magazine Indexing Error',
  'Lubrication Alarm',
  'Chip Conveyor Motor Jam',
  'Other / Unplanned Halt',
]

export function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return ''

  let diffMins = endH * 60 + endM - (startH * 60 + startM)
  if (diffMins < 0) {
    diffMins += 24 * 60
  }

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60

  if (hours === 0 && mins === 0) return '0 mins'
  if (hours === 0) return `${mins} mins`
  if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`
  return `${hours} hr${hours > 1 ? 's' : ''} ${mins} mins`
}

/** Automatically detects and returns the shift name corresponding to the current time */
export function getCurrentTimeShift(options?: string[]): string {
  const now = new Date()
  const currentMins = now.getHours() * 60 + now.getMinutes()

  const defaultShifts = [
    { name: 'Shift A (06:00 - 14:00)', prefix: 'Shift A', start: 6 * 60, end: 14 * 60 },
    { name: 'Shift B (14:00 - 22:00)', prefix: 'Shift B', start: 14 * 60, end: 22 * 60 },
    { name: 'Shift C (22:00 - 06:00)', prefix: 'Shift C', start: 22 * 60, end: 6 * 60 },
  ]

  // If specific available shift options are provided, parse their (HH:mm - HH:mm) ranges
  if (options && options.length > 0) {
    for (const opt of options) {
      const match = opt.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
      if (match) {
        const start = Number(match[1]) * 60 + Number(match[2])
        const end = Number(match[3]) * 60 + Number(match[4])
        if (start < end) {
          if (currentMins >= start && currentMins < end) {
            return opt
          }
        } else {
          // Crosses midnight (e.g. 22:00 - 06:00)
          if (currentMins >= start || currentMins < end) {
            return opt
          }
        }
      }
    }
  }

  // Fallback to standard 3 shifts:
  let targetPrefix = 'Shift A'
  if (currentMins >= 14 * 60 && currentMins < 22 * 60) {
    targetPrefix = 'Shift B'
  } else if (currentMins >= 22 * 60 || currentMins < 6 * 60) {
    targetPrefix = 'Shift C'
  }

  if (options && options.length > 0) {
    const match = options.find((o) => o.startsWith(targetPrefix))
    if (match) return match
  }

  const def = defaultShifts.find((s) => s.prefix === targetPrefix)
  return def ? def.name : 'Shift A (06:00 - 14:00)'
}

// Backwards-compatible type aliases
export type SerialWorkLog = SerialRecordItem
export type MainSerialRow = SerialRecordItem

function statusBadgeClass(status: string | undefined): string {
  const norm = String(status ?? '').toUpperCase().replace(/\s+/g, '_')
  switch (norm) {
    case 'PLANNED':
    case 'QUEUED':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'IN_PROGRESS':
    case 'RUNNING':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'COMPLETED':
    case 'FULL_READY':
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'ON_HOLD':
    case 'HOLD':
      return 'bg-purple-100 text-purple-800 border border-purple-200'
    case 'CANCELLED':
    case 'QC_REJECTED':
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200'
  }
}

export function isInProgressRecord(record: SerialRecordItem): boolean {
  const s = String(record.status ?? '').toUpperCase()
  const pct = Number(record.completedPercent) || 0
  return s === 'IN_PROGRESS' || s === 'RUNNING' || (pct > 0 && pct < 100)
}

export function isQueuedRecord(record: SerialRecordItem): boolean {
  return !isInProgressRecord(record) && (Number(record.completedPercent) || 0) < 100
}

export function ProductionPlanning() {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [options, setOptions] = useState<PlanningOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  // Filter Fields (Top Section Left Column) - Restored from localStorage across reloads
  const [selectedDate, setSelectedDate] = useState<string>(
    () => localStorage.getItem('qms_selected_date') || todayIso(),
  )
  const [selectedPlanNo, setSelectedPlanNo] = useState(
    () => localStorage.getItem('qms_selected_plan_no') || '',
  )
  const [selectedBatchNo, setSelectedBatchNo] = useState(
    () => localStorage.getItem('qms_selected_batch_no') || '',
  )
  const [selectedProject, setSelectedProject] = useState(
    () => localStorage.getItem('qms_selected_project') || '',
  )
  const [selectedProcessStep, setSelectedProcessStep] = useState(
    () => localStorage.getItem('qms_selected_process_step') || '',
  )
  const [selectedShift, setSelectedShift] = useState<string>(() => getCurrentTimeShift())
  const [selectedUser, setSelectedUser] = useState(
    () => localStorage.getItem('qms_selected_user') || '',
  )
  const [usersList, setUsersList] = useState<UserOptionItem[]>([])

  // Table serial records (active items)
  const [serialRecords, setSerialRecords] = useState<SerialRecordItem[]>([])

  // Completed Collection / Table (Persisted in state and localStorage for user history)
  // Strictly contains items that have 100% completion; any < 100% serial is purged
  const [completedRecords, setCompletedRecords] = useState<CompletedSerialRecord[]>(() => {
    try {
      const saved = localStorage.getItem('qms_completed_serial_records')
      if (saved) {
        const list = JSON.parse(saved)
        if (Array.isArray(list)) {
          const stored = getStoredSerialUpdates()
          const cleaned = list.filter((r: any) => {
            const up = stored[r.serialNumber]
            if (up && up.completedPercent < 100) return false
            if (
              (r.serialNumber === 'TB-HP-2026-0002-B02-0005' ||
                r.serialNumber === 'TB-HP-2026-0002-B02-0006') &&
              ((r.completedPercent ?? 0) < 100 || (up && up.completedPercent < 100))
            ) {
              return false
            }
            return (r.completedPercent === 100 || r.status === 'COMPLETED') && (r.completedPercent ?? 0) >= 100
          })
          try {
            if (cleaned.length !== list.length) {
              localStorage.setItem('qms_completed_serial_records', JSON.stringify(cleaned))
            }
          } catch {}
          return cleaned
        }
      }
    } catch {
      return []
    }
    return []
  })

  // Selected Serial Record IDs (Checkboxes in Work Update tab)
  const [selectedSerialIds, setSelectedSerialIds] = useState<Set<string>>(new Set())

  // Active Tab: VIEW, WORK_UPDATE, TOOL_CHANGE, BREAKDOWN (Defaults to WORK_UPDATE)
  const [activeTab, setActiveTab] = useState<ShiftTab>('WORK_UPDATE')

  // Right Column Update Fields (Work Update tab)
  const [formCompletedPercent, setFormCompletedPercent] = useState<number>(0)
  const [formStatus, setFormStatus] = useState<string>('IN_PROGRESS')
  const [formComments, setFormComments] = useState<string>('')
  const [formUser, setFormUser] = useState<string>(() => {
    const saved = localStorage.getItem('qms_selected_user')
    return saved && saved !== 'All Users' ? saved : ''
  })
  const [formUserError, setFormUserError] = useState<string | null>(null)

  // Tool Change Records & Form States (No static mock records)
  const [toolRecords, setToolRecords] = useState<ToolChangeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('qms_tool_change_records')
      if (saved) {
        const list = JSON.parse(saved)
        if (Array.isArray(list)) {
          return list.filter((r: any) => !r.id?.startsWith('tc-1') && !r.id?.startsWith('tc-2'))
        }
      }
    } catch {}
    return []
  })

  const [toolUser, setToolUser] = useState<string>(() => {
    const saved = localStorage.getItem('qms_selected_user')
    return saved && saved !== 'All Users' ? saved : ''
  })
  const [toolUserError, setToolUserError] = useState<string | null>(null)
  const [selectedToolCode, setSelectedToolCode] = useState<string>('')
  const [toolStartTime, setToolStartTime] = useState<string>('')
  const [toolEndTime, setToolEndTime] = useState<string>('')
  const [toolRemarks, setToolRemarks] = useState<string>('')

  const toolDuration = useMemo(
    () => calculateDuration(toolStartTime, toolEndTime),
    [toolStartTime, toolEndTime],
  )

  // Breakdown Records & Form States (No static mock records)
  const [breakdownRecords, setBreakdownRecords] = useState<BreakdownRecord[]>(() => {
    try {
      const saved = localStorage.getItem('qms_breakdown_records')
      if (saved) {
        const list = JSON.parse(saved)
        if (Array.isArray(list)) {
          return list.filter((r: any) => !r.id?.startsWith('bd-1'))
        }
      }
    } catch {}
    return []
  })

  const [breakdownUser, setBreakdownUser] = useState<string>(() => {
    const saved = localStorage.getItem('qms_selected_user')
    return saved && saved !== 'All Users' ? saved : ''
  })
  const [breakdownUserError, setBreakdownUserError] = useState<string | null>(null)
  const [breakdownCategory, setBreakdownCategory] = useState<string>('')
  const [breakdownStartTime, setBreakdownStartTime] = useState<string>('')
  const [breakdownEndTime, setBreakdownEndTime] = useState<string>('')
  const [breakdownReason, setBreakdownReason] = useState<string>('')

  const breakdownDuration = useMemo(
    () => calculateDuration(breakdownStartTime, breakdownEndTime),
    [breakdownStartTime, breakdownEndTime],
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [plansRes, batchesRes, optionsRes, usersRes] = await Promise.all([
        fetchPlansApi(),
        fetchAllBatchesApi(),
        fetchPlanningOptionsApi(),
        fetchAdminUsersApi().catch(() => ({ success: false, users: [] })),
      ])

      const fetchedPlans = plansRes.plans || []
      const fetchedBatches = batchesRes.batches || []
      setPlans(fetchedPlans)
      setBatches(fetchedBatches)
      if (optionsRes.options) {
        setOptions(optionsRes.options)
      }

      // Populate Users list (all users from admin API and planning operators)
      const userItems: UserOptionItem[] = []
      if (usersRes?.users && usersRes.users.length > 0) {
        usersRes.users.forEach((u) => {
          userItems.push({
            id: u.id,
            name: u.name,
            employeeCode: u.employeeCode,
            role: u.role,
          })
        })
      } else if (optionsRes.options?.operators && optionsRes.options.operators.length > 0) {
        optionsRes.options.operators.forEach((op) => {
          userItems.push({
            id: op.id,
            name: op.name,
            employeeCode: op.employeeCode,
            role: op.role,
          })
        })
      } else {
        userItems.push(
          { id: 'u-1', name: 'Ramesh Kumar', employeeCode: 'EMP-001', role: 'Operator' },
          { id: 'u-2', name: 'Suresh Patel', employeeCode: 'EMP-002', role: 'CNC Specialist' },
          { id: 'u-3', name: 'Priya Sharma', employeeCode: 'EMP-003', role: 'Quality Inspector' },
          { id: 'u-4', name: 'Vikram Singh', employeeCode: 'EMP-004', role: 'Senior Machinist' },
          { id: 'u-5', name: 'Vedhas', employeeCode: 'EMP-005', role: 'Shift Lead' },
        )
      }
      setUsersList(userItems)

      const savedPlanNo = localStorage.getItem('qms_selected_plan_no')
      const savedBatchNo = localStorage.getItem('qms_selected_batch_no')
      const savedShift = localStorage.getItem('qms_selected_shift')
      const savedUser = localStorage.getItem('qms_selected_user')
      const savedDate = localStorage.getItem('qms_selected_date')
      const savedProject = localStorage.getItem('qms_selected_project')
      const savedProcessStep = localStorage.getItem('qms_selected_process_step')

      const storedUpdates = getStoredSerialUpdates()
      const latestUpdate = Object.values(storedUpdates).sort((a, b) =>
        (b.updatedAt || '').localeCompare(a.updatedAt || ''),
      )[0]

      const effectivePlanNo = savedPlanNo || latestUpdate?.planNo
      const effectiveBatchNo = savedBatchNo || latestUpdate?.batchNo

      let targetPlan: ProductionPlan | undefined
      if (effectivePlanNo) {
        targetPlan = fetchedPlans.find((p) => p.planNo === effectivePlanNo)
      }
      if (!targetPlan && effectiveBatchNo) {
        targetPlan = fetchedPlans.find((p) => p.batchNo === effectiveBatchNo)
      }
      if (!targetPlan && effectiveBatchNo) {
        const matchingBatch = fetchedBatches.find(
          (b) =>
            b.batchNo === effectiveBatchNo ||
            b.batchNo.toLowerCase().replace(/[^a-z0-9]/g, '') ===
              effectiveBatchNo.toLowerCase().replace(/[^a-z0-9]/g, ''),
        )
        if (matchingBatch) {
          targetPlan = {
            id: matchingBatch.id || `batch-${matchingBatch.batchNo}`,
            planNo: effectivePlanNo || `PL-${matchingBatch.batchNo}`,
            batchId: matchingBatch.id,
            batchNo: matchingBatch.batchNo,
            orderId: matchingBatch.orderId || 'ORD-001',
            orderNo: matchingBatch.orderNo || 'ORD-001',
            productId: matchingBatch.productId || 'p-1',
            productCode: 'TB-CB-003',
            productName: savedProject || matchingBatch.productName || 'Compressor Blade Set',
            planDate: savedDate || todayIso(),
            shift: savedShift || 'Shift B',
            processStepName: savedProcessStep || matchingBatch.processStepName || 'CNC Machining',
            processStepInfo: '',
            process: 'CNC',
            machineId: 'm-1',
            machineCode: 'CNC-01',
            machineName: 'CNC Cell',
            operatorId: 'op-1',
            operatorName: savedUser || 'Floor Operator',
            plannedQuantity: matchingBatch.plannedQuantity || 10,
            status: 'IN_PROGRESS',
            actualQuantity: 0,
            rejectedQuantity: 0,
            reworkQuantity: 0,
          }
        }
      }
      if (!targetPlan && fetchedPlans.length > 0) {
        targetPlan = fetchedPlans[0]
      }

      // 1. Shift: Auto-select shift based on current time on initial load
      let availableShiftOptions: string[] = []
      if (optionsRes.options?.shifts && optionsRes.options.shifts.length > 0) {
        availableShiftOptions = optionsRes.options.shifts.map((s) => {
          if (s.name && s.name.includes('(')) return s.name
          return s.startTime && s.endTime
            ? `${s.name} (${s.startTime} - ${s.endTime})`
            : s.name
        })
      } else {
        availableShiftOptions = [
          'Shift A (06:00 - 14:00)',
          'Shift B (14:00 - 22:00)',
          'Shift C (22:00 - 06:00)',
        ]
      }
      const initialShift = getCurrentTimeShift(availableShiftOptions)
      setSelectedShift(initialShift)
      try {
        localStorage.setItem('qms_selected_shift', initialShift)
      } catch {}

      // 2. User: Determine initial user selection
      let initialUser = ''
      if (savedUser !== null && savedUser !== undefined) {
        initialUser = savedUser === 'All Users' ? '' : savedUser
      } else if (targetPlan?.operatorName) {
        initialUser = targetPlan.operatorName
      }
      setSelectedUser(initialUser)
      if (initialUser && initialUser !== 'All Users') {
        setFormUser(initialUser)
        setToolUser(initialUser)
        setBreakdownUser(initialUser)
      } else {
        setFormUser('')
        setToolUser('')
        setBreakdownUser('')
      }

      if (targetPlan) {
        setSelectedPlanNo(targetPlan.planNo)
        setSelectedBatchNo(targetPlan.batchNo)
        setSelectedProject(savedProject || targetPlan.productName)
        setSelectedProcessStep(savedProcessStep || targetPlan.processStepName)
        if (savedDate) setSelectedDate(savedDate)

        try {
          localStorage.setItem('qms_selected_plan_no', targetPlan.planNo)
          localStorage.setItem('qms_selected_batch_no', targetPlan.batchNo)
        } catch {}

        // Populate initial serial records
        generateRecordsForPlan(targetPlan, fetchedBatches)
      } else {
        if (savedDate) setSelectedDate(savedDate)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift records.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      const [plansRes, batchesRes, usersRes] = await Promise.all([
        fetchPlansApi(),
        fetchAllBatchesApi(),
        fetchAdminUsersApi().catch(() => ({ success: false, users: [] })),
      ])
      if (plansRes.plans) setPlans(plansRes.plans)
      if (batchesRes.batches) setBatches(batchesRes.batches)
      if (usersRes?.users && usersRes.users.length > 0) {
        setUsersList(
          usersRes.users.map((u) => ({
            id: u.id,
            name: u.name,
            employeeCode: u.employeeCode,
            role: u.role,
          })),
        )
      }
      toast.success('Production plan and batch lists refreshed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data.')
    } finally {
      setRefreshing(false)
    }
  }

  // Unique Options for Select Boxes
  const planNoOptions = useMemo(() => {
    const list = [
      ...plans.map((p) => p.planNo),
      ...Object.values(getStoredSerialUpdates()).map((u) => u.planNo),
    ]
    return Array.from(new Set(list.filter(Boolean) as string[]))
  }, [plans])

  const batchOptions = useMemo(() => {
    const list = [
      ...plans.map((p) => p.batchNo),
      ...batches.map((b) => b.batchNo),
      ...Object.values(getStoredSerialUpdates()).map((u) => u.batchNo),
    ]
    return Array.from(new Set(list.filter(Boolean) as string[]))
  }, [plans, batches])

  const projectOptions = useMemo(() => {
    const list = [
      ...plans.map((p) => p.productName),
      ...batches.map((b) => b.productName),
      ...(options?.products || []).map((p) => p.name),
    ]
    return Array.from(new Set(list.filter(Boolean)))
  }, [plans, batches, options])

  const processStepOptions = useMemo(() => {
    const list = [
      ...plans.map((p) => p.processStepName),
      ...(options?.processSteps || []).map((s) => s.name),
    ]
    return Array.from(new Set(list.filter(Boolean)))
  }, [plans, options])

  const shiftOptions = useMemo(() => {
    if (options?.shifts && options.shifts.length > 0) {
      return options.shifts.map((s) => {
        if (s.name && s.name.includes('(')) return s.name
        return s.startTime && s.endTime
          ? `${s.name} (${s.startTime} - ${s.endTime})`
          : s.name
      })
    }
    return [
      'Shift A (06:00 - 14:00)',
      'Shift B (14:00 - 22:00)',
      'Shift C (22:00 - 06:00)',
    ]
  }, [options])

  const userSelectOptions = useMemo<SelectOption[]>(() => {
    return [
      {
        value: '',
        label: 'All Users',
        badge: `${usersList.length} users`,
      },
      ...usersList.map((u) => ({
        value: u.name,
        label: u.name,
        subLabel: u.employeeCode ? `ID: ${u.employeeCode}` : undefined,
        badge: u.role || undefined,
      })),
    ]
  }, [usersList])

  const formUserOptions = useMemo<SelectOption[]>(() => {
    return usersList.map((u) => ({
      value: u.name,
      label: u.name,
      subLabel: u.employeeCode ? `ID: ${u.employeeCode}` : undefined,
      badge: u.role || undefined,
    }))
  }, [usersList])

  // Synchronize formUser, toolUser, and breakdownUser whenever selectedUser changes in the top filter section
  useEffect(() => {
    if (selectedUser && selectedUser.trim() !== '' && selectedUser.trim() !== 'All Users') {
      setFormUser(selectedUser.trim())
      setToolUser(selectedUser.trim())
      setBreakdownUser(selectedUser.trim())
    } else {
      setFormUser('')
      setToolUser('')
      setBreakdownUser('')
    }
    setFormUserError(null)
    setToolUserError(null)
    setBreakdownUserError(null)
  }, [selectedUser])

  // Synchronize when Plan No changes
  function handlePlanNoChange(planNo: string) {
    setSelectedPlanNo(planNo)
    try {
      localStorage.setItem('qms_selected_plan_no', planNo)
    } catch {}
    const matching = plans.find((p) => p.planNo === planNo)
    if (matching) {
      if (matching.batchNo) {
        setSelectedBatchNo(matching.batchNo)
        try {
          localStorage.setItem('qms_selected_batch_no', matching.batchNo)
        } catch {}
      }
      if (matching.productName) {
        setSelectedProject(matching.productName)
        try {
          localStorage.setItem('qms_selected_project', matching.productName)
        } catch {}
      }
      if (matching.processStepName) {
        setSelectedProcessStep(matching.processStepName)
        try {
          localStorage.setItem('qms_selected_process_step', matching.processStepName)
        } catch {}
      }
      if (matching.operatorName) {
        setSelectedUser(matching.operatorName)
        try {
          localStorage.setItem('qms_selected_user', matching.operatorName)
        } catch {}
      }
      if (matching.shift) {
        const cleanShift = matching.shift.trim()
        const cleanPrefix = cleanShift.split(' (')[0]
        const fullShift =
          shiftOptions.find((s) => s.startsWith(cleanPrefix)) || cleanShift
        setSelectedShift(fullShift)
        try {
          localStorage.setItem('qms_selected_shift', fullShift)
        } catch {}
      }
      generateRecordsForPlan(matching, batches)
    }
  }

  // Synchronize when Batch changes
  function handleBatchChange(batchNo: string) {
    setSelectedBatchNo(batchNo)
    try {
      localStorage.setItem('qms_selected_batch_no', batchNo)
    } catch {}
    const matching = plans.find((p) => p.batchNo === batchNo)
    if (matching) {
      if (matching.planNo) {
        setSelectedPlanNo(matching.planNo)
        try {
          localStorage.setItem('qms_selected_plan_no', matching.planNo)
        } catch {}
      }
      if (matching.productName) {
        setSelectedProject(matching.productName)
        try {
          localStorage.setItem('qms_selected_project', matching.productName)
        } catch {}
      }
      if (matching.processStepName) {
        setSelectedProcessStep(matching.processStepName)
        try {
          localStorage.setItem('qms_selected_process_step', matching.processStepName)
        } catch {}
      }
      if (matching.operatorName) {
        setSelectedUser(matching.operatorName)
        try {
          localStorage.setItem('qms_selected_user', matching.operatorName)
        } catch {}
      }
      generateRecordsForPlan(matching, batches)
    } else {
      const matchBatch = batches.find((b) => b.batchNo === batchNo)
      if (matchBatch) {
        const dynamicPlan: ProductionPlan = {
          id: matchBatch.id || `batch-${batchNo}`,
          planNo: `PL-${batchNo}`,
          orderId: matchBatch.orderId || 'ORD-001',
          batchId: matchBatch.id,
          batchNo: matchBatch.batchNo,
          productId: matchBatch.productId || 'prod-1',
          productCode: 'TB-CB-003',
          productName: matchBatch.productName || 'Compressor Blade Set',
          planDate: todayIso(),
          shift: selectedShift || 'Shift B',
          process: 'CNC',
          processStepName: matchBatch.processStepName || 'CNC Machining',
          processStepInfo: '',
          machineId: 'm-1',
          machineCode: currentMachineCode,
          machineName: 'CNC Cell',
          operatorId: 'op-1',
          operatorName: selectedUser || 'Floor Operator',
          plannedQuantity: matchBatch.plannedQuantity || 10,
          status: 'IN_PROGRESS',
          actualQuantity: 0,
          rejectedQuantity: 0,
          reworkQuantity: 0,
        }
        generateRecordsForPlan(dynamicPlan, batches)
      }
    }
  }

  // Generate / Compile serial records for a given plan
  function generateRecordsForPlan(plan: ProductionPlan, allBatches: ProductionBatch[]) {
    const matchingBatch = allBatches.find(
      (b) => b.id === plan.batchId || b.batchNo === plan.batchNo,
    )

    const records: SerialRecordItem[] = []
    const count = matchingBatch?.plannedQuantity || plan.plannedQuantity || 10
    const batchNo = plan.batchNo || selectedBatchNo || matchingBatch?.batchNo || 'B01'
    const procName = plan.process || 'CNC'
    const stepName =
      plan.processStepName ||
      selectedProcessStep ||
      matchingBatch?.processStepName ||
      'CNC Machining'
    const prodName =
      plan.productName ||
      selectedProject ||
      matchingBatch?.productName ||
      'Compressor Blade Set'
    const prodCode = plan.productCode || 'TB-CB-003'
    const orderId = plan.orderId || matchingBatch?.orderId
    const batchId = plan.batchId || matchingBatch?.id
    const planDate = plan.planDate || plan.startDate || selectedDate

    const storedUpdates = getStoredSerialUpdates()

    if (matchingBatch?.serials && matchingBatch.serials.length > 0) {
      matchingBatch.serials.forEach((s, idx) => {
        const stored = storedUpdates[s.serialNumber]
        const finalStatus =
          stored?.status || s.status || (idx === 0 ? 'IN_PROGRESS' : 'QUEUED')
        const finalPercent =
          stored?.completedPercent !== undefined
            ? stored.completedPercent
            : typeof s.completedPercent === 'number'
              ? s.completedPercent
              : s.status === 'COMPLETED' || s.status === 'FULL_READY'
                ? 100
                : idx === 0
                  ? 30
                  : 0

        records.push({
          id: `${batchNo}-${s.serialNumber}-${idx}`,
          serialNumber: s.serialNumber,
          batchNo,
          productName: prodName,
          productCode: prodCode,
          processName: procName,
          processStepName:
            stored?.processStepName || s.currentProcessStepName || stepName,
          shift:
            stored?.shift || s.shift || selectedShift || plan.shift || 'Shift B',
          status: finalStatus,
          completedPercent: finalPercent,
          comments:
            stored?.comments ??
            (s.comments || (idx === 0 ? 'Machining in progress (30% completed)' : '')),
          orderId,
          batchId,
          operatorName:
            stored?.operatorName ||
            s.operatorName ||
            plan.operatorName ||
            selectedUser ||
            '',
          operatorId: s.operatorId ? String(s.operatorId) : plan.operatorId,
          date: stored?.date || planDate,
          planNo: stored?.planNo || plan.planNo,
        })
      })
    } else {
      // Clean serial sequence generated for the actual batch planned quantity
      for (let i = 0; i < count; i++) {
        const num = String(i + 1).padStart(4, '0')
        const sn = `SN-${batchNo}-${num}`
        const stored = storedUpdates[sn]
        const isFirst = i === 0
        const finalStatus = stored?.status || (isFirst ? 'IN_PROGRESS' : 'QUEUED')
        const finalPercent =
          stored?.completedPercent !== undefined
            ? stored.completedPercent
            : isFirst
              ? 30
              : 0

        records.push({
          id: `${batchNo}-${sn}-${i}`,
          serialNumber: sn,
          batchNo,
          productName: prodName,
          productCode: prodCode,
          processName: procName,
          processStepName: stored?.processStepName || stepName,
          shift: stored?.shift || selectedShift || plan.shift || 'Shift B',
          status: finalStatus,
          completedPercent: finalPercent,
          comments:
            stored?.comments ??
            (isFirst ? 'Machining in progress (30% completed)' : ''),
          orderId,
          batchId,
          operatorName:
            stored?.operatorName || plan.operatorName || selectedUser || '',
          operatorId: plan.operatorId,
          date: stored?.date || planDate,
          planNo: stored?.planNo || plan.planNo,
        })
      }
    }

    // Also include any stored updates that belong to this batch/plan if they weren't already in records
    // (e.g. TB-HP-2026-0002-B02-0005 or TB-HP-2026-0002-B02-0006)
    Object.values(storedUpdates).forEach((up) => {
      const cleanBatch = batchNo.toLowerCase().replace(/[^a-z0-9]/g, '')
      const upBatch = (up.batchNo || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const batchMatches =
        upBatch === cleanBatch ||
        (up.serialNumber &&
          up.serialNumber.toLowerCase().includes(`-${cleanBatch}-`)) ||
        (up.planNo && up.planNo === plan.planNo)

      if (batchMatches && !records.some((r) => r.serialNumber === up.serialNumber)) {
        records.push({
          id: `${batchNo}-${up.serialNumber}`,
          serialNumber: up.serialNumber,
          batchNo,
          productName: up.productName || prodName,
          productCode: prodCode,
          processName: procName,
          processStepName: up.processStepName || stepName,
          shift: up.shift || selectedShift || plan.shift || 'Shift B',
          status: up.status,
          completedPercent: up.completedPercent,
          comments: up.comments || '',
          orderId: up.orderId || orderId,
          batchId: up.batchId || batchId,
          operatorName:
            up.operatorName || plan.operatorName || selectedUser || '',
          operatorId: plan.operatorId,
          date: up.date || planDate,
          planNo: up.planNo || plan.planNo,
        })
      }
    })

    // Exclude only serials that are genuinely 100% completed
    let completedSet = new Set(
      completedRecords
        .filter((c) => (c.completedPercent ?? 0) >= 100 || c.status === 'COMPLETED')
        .map((c) => c.serialNumber),
    )
    if (completedSet.size === 0) {
      try {
        const saved = localStorage.getItem('qms_completed_serial_records')
        if (saved) {
          const list: CompletedSerialRecord[] = JSON.parse(saved)
          completedSet = new Set(
            list
              .filter(
                (c) => (c.completedPercent ?? 0) >= 100 || c.status === 'COMPLETED',
              )
              .map((c) => c.serialNumber),
          )
        }
      } catch {}
    }

    // STRICT: Only exclude if it is genuinely complete (>= 100% or COMPLETED/FULL_READY) AND NOT marked < 100% in storedUpdates.
    // If a record has < 100%, it MUST stay in active records!
    const activeRecords = records.filter((r) => {
      const stored = storedUpdates[r.serialNumber]
      if (stored && stored.completedPercent < 100) {
        return true // Always keep in active records!
      }
      const isComplete =
        ((r.completedPercent ?? 0) >= 100 ||
          r.status === 'COMPLETED' ||
          r.status === 'FULL_READY') &&
        completedSet.has(r.serialNumber)
      return !isComplete
    })

    activeRecords.sort((a, b) => a.serialNumber.localeCompare(b.serialNumber))

    setSerialRecords(activeRecords)
    setSelectedSerialIds(new Set())
  }

  // Handle "Get Details" Button Click - Dynamically Fetch from DB with Selected Filters
  async function handleGetDetails() {
    setFetchingDetails(true)
    setError(null)
    setSelectedSerialIds(new Set())

    try {
      if (selectedPlanNo) localStorage.setItem('qms_selected_plan_no', selectedPlanNo)
      if (selectedBatchNo) localStorage.setItem('qms_selected_batch_no', selectedBatchNo)
      if (selectedShift) localStorage.setItem('qms_selected_shift', selectedShift)
      if (selectedDate) localStorage.setItem('qms_selected_date', selectedDate)
      if (selectedProject) localStorage.setItem('qms_selected_project', selectedProject)
      if (selectedProcessStep) localStorage.setItem('qms_selected_process_step', selectedProcessStep)
      if (selectedUser) localStorage.setItem('qms_selected_user', selectedUser)
    } catch {}

    try {
      const cleanShift = selectedShift ? selectedShift.split(' (')[0].trim() : ''
      const userItem = usersList.find((u) => u.name === selectedUser)

      const [plansRes, batchesRes] = await Promise.all([
        fetchPlansApi({
          date: selectedDate || undefined,
          shift: cleanShift || undefined,
          batchId: selectedBatchNo || undefined,
          operatorId: userItem?.id && userItem.id.length === 24 ? userItem.id : undefined,
        }).catch(() => fetchPlansApi().catch(() => ({ success: false, plans: [] }))),
        fetchAllBatchesApi().catch(() => ({ success: false, batches: [] })),
      ])

      const fetchedPlans = plansRes?.plans && plansRes.plans.length > 0 ? plansRes.plans : plans
      const fetchedBatches = batchesRes?.batches && batchesRes.batches.length > 0 ? batchesRes.batches : batches

      if (plansRes?.plans && plansRes.plans.length > 0) setPlans(plansRes.plans)
      if (batchesRes?.batches && batchesRes.batches.length > 0) setBatches(batchesRes.batches)

      const matchedPlan =
        fetchedPlans.find((p) => {
          if (selectedPlanNo && p.planNo !== selectedPlanNo) return false
          if (selectedBatchNo && p.batchNo !== selectedBatchNo) return false
          return true
        }) ||
        fetchedPlans.find((p) => p.planNo === selectedPlanNo) ||
        fetchedPlans.find((p) => p.batchNo === selectedBatchNo) ||
        plans.find((p) => p.planNo === selectedPlanNo)

      if (matchedPlan) {
        generateRecordsForPlan(matchedPlan, fetchedBatches)
         toast.success(
          `Fetched database records for Plan ${matchedPlan.planNo} (Batch ${matchedPlan.batchNo})${selectedUser ? ` - Operator: ${selectedUser}` : ''}.`,
        )
      } else {
        const matchingBatch =
          fetchedBatches.find((b) => b.batchNo === selectedBatchNo) ||
          batches.find((b) => b.batchNo === selectedBatchNo) ||
          fetchedBatches[0] ||
          batches[0]

        if (matchingBatch) {
          const dynamicPlan: ProductionPlan = {
            id: matchingBatch.id || 'batch-plan',
            planNo: selectedPlanNo || `PLN-${selectedBatchNo || matchingBatch.batchNo}`,
            batchId: matchingBatch.id,
            batchNo: selectedBatchNo || matchingBatch.batchNo,
            productId: matchingBatch.productId || 'p-1',
            productCode: 'TB-CB-003',
            productName: selectedProject || matchingBatch.productName || 'Compressor Blade Set',
            planDate: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString(),
            startDate: selectedDate,
            endDate: selectedDate,
            shift: selectedShift || 'Shift B',
            processStepName: selectedProcessStep || matchingBatch.processStepName || 'CNC Machining',
            processStepInfo: '',
            process: 'CNC',
            machineId: 'm-1',
            machineCode: currentMachineCode,
            machineName: 'CNC Cell',
            operatorId: userItem?.id || 'op-1',
            operatorName: selectedUser || 'Floor Operator',
            plannedQuantity: matchingBatch.plannedQuantity || 12,
            status: 'IN_PROGRESS',
            actualQuantity: (matchingBatch as any).completedQuantity || 0,
            rejectedQuantity: 0,
            reworkQuantity: 0,
          }
          generateRecordsForPlan(dynamicPlan, fetchedBatches)
          toast.success(`Fetched database records for Batch ${matchingBatch.batchNo}.`)
        } else {
          setSerialRecords([])
          toast.success('No records found for the selected filters in database.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch details from database.')
    } finally {
      setTimeout(() => setFetchingDetails(false), 200)
    }
  }

  const currentMachineCode = useMemo(() => {
    const match = plans.find((p) => p.planNo === selectedPlanNo || p.batchNo === selectedBatchNo)
    return match?.machineCode || 'CNC-01'
  }, [plans, selectedPlanNo, selectedBatchNo])

  // In Work Update tab: show all queued/new and inprogress serial records present in that batch/plan
  // Serial records are NOT restricted by user or shift, enabling handover between shifts/operators
  const workUpdateRecords = useMemo(() => {
    return serialRecords.filter((r) => {
      const s = (r.status || '').toUpperCase()
      const pct = Number(r.completedPercent) || 0

      // Strict requirement: It should ALWAYS show in Work Update tab until it is updated with 100%
      if (pct >= 100 || s === 'COMPLETED' || s === 'FULL_READY' || s === 'APPROVED') {
        return false
      }

      // Filter by Process Step
      if (selectedProcessStep) {
        const rowStep = (r.processStepName || r.processName || '').toLowerCase()
        const targetStep = selectedProcessStep.toLowerCase()
        if (rowStep && !rowStep.includes(targetStep) && !targetStep.includes(rowStep)) {
          return false
        }
      }

      // Filter by Plan No
      if (selectedPlanNo && r.planNo) {
        if (r.planNo.trim().toLowerCase() !== selectedPlanNo.trim().toLowerCase()) {
          return false
        }
      }

      // Filter by Batch (flexible match e.g. B02 in B-02 or B02)
      if (selectedBatchNo && r.batchNo) {
        const cleanRow = r.batchNo.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanTarget = selectedBatchNo.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (
          cleanRow &&
          cleanTarget &&
          cleanRow !== cleanTarget &&
          !cleanRow.includes(cleanTarget) &&
          !cleanTarget.includes(cleanRow)
        ) {
          return false
        }
      }

      // Filter by Project
      if (selectedProject && r.productName) {
        if (r.productName.trim().toLowerCase() !== selectedProject.trim().toLowerCase()) {
          return false
        }
      }

      return true
    })
  }, [
    serialRecords,
    selectedPlanNo,
    selectedBatchNo,
    selectedProject,
    selectedProcessStep,
  ])

  // In View tab: show all completed records filtered dynamically by selections
  const viewCompletedRecords = useMemo(() => {
    const allCompleted: CompletedSerialRecord[] = []
    const seen = new Set<string>()
    const storedUpdates = getStoredSerialUpdates()

    // 1. Completed serials from real database batches
    batches.forEach((b) => {
      (b.serials || []).forEach((s) => {
        // Exclude if stored update says it is < 100%
        const stored = storedUpdates[s.serialNumber]
        if (stored && stored.completedPercent < 100) {
          return
        }

        const statusUpper = String(s.status || '').toUpperCase()
        const pct =
          typeof s.completedPercent === 'number'
            ? s.completedPercent
            : statusUpper === 'COMPLETED'
              ? 100
              : 0
        if (statusUpper === 'COMPLETED' || statusUpper === 'FULL_READY' || pct === 100) {
          if (!seen.has(s.serialNumber)) {
            seen.add(s.serialNumber)
            const parentPlan = plans.find((p) => p.batchId === b.id || p.batchNo === b.batchNo)
            allCompleted.push({
              id: `${b.batchNo}-${s.serialNumber}`,
              serialNumber: s.serialNumber,
              batchNo: b.batchNo,
              productName: b.productName || 'Compressor Blade Set',
              productCode: 'TB-CB-003',
              processName: b.processStepName || 'CNC',
              processStepName: s.currentProcessStepName || b.processStepName || 'CNC Machining',
              shift: s.shift || 'Shift B',
              status: 'COMPLETED',
              completedPercent: 100,
              comments: s.comments || 'Completed in production',
              orderId: b.orderId,
              batchId: b.id,
              completedAt: new Date().toISOString(),
              completedBy: s.operatorName || b.productionInCharge || parentPlan?.operatorName,
              planNo: parentPlan?.planNo,
              date: parentPlan?.planDate?.slice(0, 10) || parentPlan?.startDate?.slice(0, 10),
            })
          }
        }
      })
    })

    // 2. Completed serials from session / local completed records
    completedRecords.forEach((c) => {
      // Exclude if stored update says it is < 100%
      const stored = storedUpdates[c.serialNumber]
      if (stored && stored.completedPercent < 100) {
        return
      }

      if ((c.completedPercent ?? 0) < 100 && c.status !== 'COMPLETED') {
        return
      }

      if (!seen.has(c.serialNumber)) {
        seen.add(c.serialNumber)
        allCompleted.push(c)
      } else {
        const idx = allCompleted.findIndex((item) => item.serialNumber === c.serialNumber)
        if (idx >= 0) {
          allCompleted[idx] = { ...allCompleted[idx], ...c }
        }
      }
    })

    // 3. Dynamic filter by selected fields in "Select Production Plan & Shift"
    return allCompleted.filter((row) => {
      // Must be 100%
      if ((row.completedPercent ?? 0) < 100) return false

      // Filter by Plan No
      if (selectedPlanNo) {
        const plan = plans.find((p) => p.planNo === selectedPlanNo)
        const rowPlanMatch = row.planNo
          ? row.planNo === selectedPlanNo
          : plan && row.batchNo === plan.batchNo
        if (!rowPlanMatch) return false
      }

      // Filter by Batch
      if (selectedBatchNo) {
        const cleanRow = (row.batchNo || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanTarget = selectedBatchNo.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (
          cleanRow &&
          cleanTarget &&
          cleanRow !== cleanTarget &&
          !cleanRow.includes(cleanTarget) &&
          !cleanTarget.includes(cleanRow)
        ) {
          return false
        }
      }

      // Filter by Project
      if (selectedProject && row.productName && row.productName !== selectedProject) {
        return false
      }

      // Filter by Process Step
      if (selectedProcessStep) {
        const rowStep = (row.processStepName || row.processName || '').toLowerCase()
        const targetStep = selectedProcessStep.toLowerCase()
        if (rowStep && !rowStep.includes(targetStep) && !targetStep.includes(rowStep)) {
          return false
        }
      }

      return true
    })
  }, [
    batches,
    completedRecords,
    plans,
    selectedPlanNo,
    selectedBatchNo,
    selectedProject,
    selectedProcessStep,
  ])

  // Tab 3: Tool Change - Filtered Dynamically by Selection
  const filteredToolRecords = useMemo(() => {
    return toolRecords.filter((record) => {
      // Filter by Date
      if (selectedDate && record.date && record.date !== selectedDate) return false

      // Filter by Shift (clean prefix match)
      if (selectedShift && record.shift) {
        const cleanFilter = selectedShift.split(' (')[0].trim().toUpperCase()
        const cleanRec = record.shift.split(' (')[0].trim().toUpperCase()
        if (cleanFilter && cleanRec && cleanFilter !== cleanRec) return false
      }

      // Filter by User (only show this user's tool changes)
      if (selectedUser && selectedUser.trim() !== '' && selectedUser.trim() !== 'All Users') {
        const targetUser = selectedUser.trim().toLowerCase()
        const recordUser = (record.operatorName || '').trim().toLowerCase()
        if (recordUser && recordUser !== targetUser) return false
      }

      // Filter by Plan No
      if (selectedPlanNo && record.planNo && record.planNo !== selectedPlanNo) {
        return false
      }

      // Filter by Batch
      if (selectedBatchNo && record.batchNo && record.batchNo !== selectedBatchNo) {
        return false
      }

      // Filter by Machine Code
      if (currentMachineCode && record.machineCode && record.machineCode !== currentMachineCode) {
        return false
      }

      return true
    })
  }, [
    toolRecords,
    selectedDate,
    selectedShift,
    selectedUser,
    selectedPlanNo,
    selectedBatchNo,
    currentMachineCode,
  ])

  // Tab 4: Break Down - Filtered Dynamically by Selection
  const filteredBreakdownRecords = useMemo(() => {
    return breakdownRecords.filter((record) => {
      // Filter by Date
      if (selectedDate && record.date && record.date !== selectedDate) return false

      // Filter by Shift (clean prefix match)
      if (selectedShift && record.shift) {
        const cleanFilter = selectedShift.split(' (')[0].trim().toUpperCase()
        const cleanRec = record.shift.split(' (')[0].trim().toUpperCase()
        if (cleanFilter && cleanRec && cleanFilter !== cleanRec) return false
      }

      // Filter by User (only show this user's breakdowns)
      if (selectedUser && selectedUser.trim() !== '' && selectedUser.trim() !== 'All Users') {
        const targetUser = selectedUser.trim().toLowerCase()
        const recordUser = (record.operatorName || '').trim().toLowerCase()
        if (recordUser && recordUser !== targetUser) return false
      }

      // Filter by Plan No
      if (selectedPlanNo && record.planNo && record.planNo !== selectedPlanNo) {
        return false
      }

      // Filter by Batch
      if (selectedBatchNo && record.batchNo && record.batchNo !== selectedBatchNo) {
        return false
      }

      // Filter by Machine Code
      if (currentMachineCode && record.machineCode && record.machineCode !== currentMachineCode) {
        return false
      }

      return true
    })
  }, [
    breakdownRecords,
    selectedDate,
    selectedShift,
    selectedUser,
    selectedPlanNo,
    selectedBatchNo,
    currentMachineCode,
  ])

  // Queued records eligible for multi-selection
  const queuedRecords = useMemo(
    () => workUpdateRecords.filter((r) => isQueuedRecord(r)),
    [workUpdateRecords],
  )

  const selectedRecords = useMemo(
    () => serialRecords.filter((r) => selectedSerialIds.has(r.id)),
    [serialRecords, selectedSerialIds],
  )

  const hasSelectedInProgress = useMemo(
    () => selectedRecords.some((r) => isInProgressRecord(r)),
    [selectedRecords],
  )

  const isAllQueuedSelected =
    queuedRecords.length > 0 &&
    selectedSerialIds.size === queuedRecords.length &&
    !hasSelectedInProgress

  // Toggle selection of a single row
  function handleToggleRow(id: string) {
    const item = serialRecords.find((r) => r.id === id)
    if (!item) return

    const isCurrentlySelected = selectedSerialIds.has(id)
    if (isCurrentlySelected) {
      // Unchecking is always allowed
      setSelectedSerialIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return
    }

    const isProg = isInProgressRecord(item)

    // Restrict multi-selection of In-Progress records:
    if (hasSelectedInProgress) {
      setError(
        'In-Progress records cannot be multi-selected. Only Queued serial numbers can be selected together in bulk.',
      )
      return
    }

    if (selectedSerialIds.size > 0 && isProg) {
      setError(
        'In-Progress records cannot be multi-selected with Queued records. Only Queued serial numbers can be updated in bulk.',
      )
      return
    }

    // Allowed: add to selection
    setError(null)
    setSelectedSerialIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  // Toggle select all (Only Queued serials are enabled for bulk selection)
  function handleToggleSelectAll() {
    if (queuedRecords.length === 0) return

    if (isAllQueuedSelected) {
      setSelectedSerialIds(new Set())
    } else {
      setError(null)
      setSelectedSerialIds(new Set(queuedRecords.map((r) => r.id)))
    }
  }

  // Handle Tool Change Submission
  function handleSubmitToolChange() {
    if (!toolUser || toolUser.trim() === '' || toolUser.trim() === 'All Users') {
      setToolUserError('Please select an assigned user / operator.')
      setError('Please select an assigned user / operator for tool usage.')
      return
    }
    if (!selectedToolCode) {
      setError('Please select an assigned tool.')
      return
    }
    if (!toolStartTime || !toolEndTime) {
      setError('Please provide both Start time and End time for tool usage.')
      return
    }
    const toolObj =
      ASSIGNED_TOOLS.find((t) => t.code === selectedToolCode) || ASSIGNED_TOOLS[0]
    const dur = calculateDuration(toolStartTime, toolEndTime) || '0 mins'
    const assignedOperator = toolUser.trim()

    const newRecord: ToolChangeRecord = {
      id: `tc-${Date.now()}`,
      toolCode: toolObj.code,
      toolName: toolObj.name,
      machineCode: currentMachineCode,
      planNo: selectedPlanNo,
      batchNo: selectedBatchNo,
      processStepName: selectedProcessStep,
      shift: selectedShift || 'Shift B',
      date: selectedDate,
      operatorName: assignedOperator,
      startTime: toolStartTime,
      endTime: toolEndTime,
      duration: dur,
      remarks: toolRemarks.trim() || 'Tool mounted & operational check OK',
      status: 'COMPLETED',
      loggedAt: `${selectedDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    }

    setToolRecords((prev) => {
      const next = [newRecord, ...prev]
      try {
        localStorage.setItem('qms_tool_change_records', JSON.stringify(next))
      } catch {}
      return next
    })

    setSelectedToolCode('')
    setToolStartTime('')
    setToolEndTime('')
    setToolRemarks('')
    setToolUserError(null)
    toast.success(`Tool change logged for ${toolObj.code} (${dur}) by ${assignedOperator}.`)
  }

  // Handle Breakdown Submission
  function handleSubmitBreakdown() {
    if (!breakdownUser || breakdownUser.trim() === '' || breakdownUser.trim() === 'All Users') {
      setBreakdownUserError('Please select an assigned user / operator.')
      setError('Please select an assigned user / operator for machine breakdown.')
      return
    }
    if (!breakdownCategory) {
      setError('Please select a machine issue category.')
      return
    }
    if (!breakdownStartTime || !breakdownEndTime) {
      setError('Please provide both Start time and End time for the breakdown.')
      return
    }
    if (!breakdownReason.trim()) {
      setError('Please provide a Reason describing the breakdown or stoppage.')
      return
    }
    const dur = calculateDuration(breakdownStartTime, breakdownEndTime) || '0 mins'
    const assignedOperator = breakdownUser.trim()

    const newRecord: BreakdownRecord = {
      id: `bd-${Date.now()}`,
      machineCode: currentMachineCode,
      category: breakdownCategory,
      planNo: selectedPlanNo,
      batchNo: selectedBatchNo,
      shift: selectedShift || 'Shift B',
      date: selectedDate,
      operatorName: assignedOperator,
      startTime: breakdownStartTime,
      endTime: breakdownEndTime,
      duration: dur,
      reason: breakdownReason.trim(),
      status: 'RESOLVED',
      loggedAt: `${selectedDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    }

    setBreakdownRecords((prev) => {
      const next = [newRecord, ...prev]
      try {
        localStorage.setItem('qms_breakdown_records', JSON.stringify(next))
      } catch {}
      return next
    })

    setBreakdownCategory('')
    setBreakdownStartTime('')
    setBreakdownEndTime('')
    setBreakdownReason('')
    setBreakdownUserError(null)
    toast.success(`Breakdown record logged for ${newRecord.machineCode} (${dur}) by ${assignedOperator}.`)
  }

  // Synchronize form when selected serials change
  useEffect(() => {
    if (selectedSerialIds.size === 1) {
      const singleId = Array.from(selectedSerialIds)[0]
      const item = serialRecords.find((r) => r.id === singleId)
      if (item) {
        setFormCompletedPercent(item.completedPercent)
        setFormStatus(item.status)
        // Note: Comments are left un-prefilled per user request
      }
    } else if (selectedSerialIds.size > 1) {
      const selectedItems = serialRecords.filter((r) => selectedSerialIds.has(r.id))
      const firstItem = selectedItems[0]
      if (firstItem) {
        const hasInProgress = selectedItems.some((item) => item.status === 'IN_PROGRESS')
        setFormStatus(hasInProgress ? 'IN_PROGRESS' : firstItem.status)
        const maxPercent = Math.max(...selectedItems.map((item) => item.completedPercent || 0))
        setFormCompletedPercent(maxPercent > 0 ? maxPercent : 0)
      }
    }
  }, [selectedSerialIds, serialRecords])

  // Apply Update to Selected Serial Records
  function handleApplyUpdate() {
    if (selectedSerialIds.size === 0) return

    // Guard: In-Progress records cannot be multi-selected
    if (selectedSerialIds.size > 1) {
      const selectedItems = serialRecords.filter((r) => selectedSerialIds.has(r.id))
      const hasProg = selectedItems.some((r) => isInProgressRecord(r))
      if (hasProg) {
        setError(
          'In-Progress records cannot be updated in bulk. Please update In-Progress serials individually, or select only Queued serials for multi-selection.',
        )
        return
      }
    }

    // Validate required user / operator selection:
    if (!formUser || formUser.trim() === '' || formUser.trim() === 'All Users') {
      setFormUserError('Please select an assigned user / operator.')
      setError('Please select an assigned user / operator in Update Progress to proceed.')
      return
    }

    const assignedUser = formUser.trim()
    const userItem = usersList.find((u) => u.name === assignedUser)
    const assignedUserId = userItem?.id

    const updatedPercent =
      formStatus === 'COMPLETED'
        ? 100
        : Math.min(100, Math.max(0, Number(formCompletedPercent) || 0))

    // Auto-align status with completion percentage
    let updatedStatus = formStatus
    if (updatedPercent === 100) {
      updatedStatus = 'COMPLETED'
    } else if (updatedPercent > 0 && (updatedStatus === 'PLANNED' || updatedStatus === 'QUEUED')) {
      updatedStatus = 'IN_PROGRESS'
    }

    const updatedComments = formComments.trim()
    const selectedCount = selectedSerialIds.size

    if (updatedStatus === 'COMPLETED') {
      // 1. Extract selected records to store in completed collection/table
      const itemsToComplete = serialRecords.filter((r) => selectedSerialIds.has(r.id))
      const completedEntries: CompletedSerialRecord[] = itemsToComplete.map((item) => ({
        ...item,
        status: 'COMPLETED',
        completedPercent: 100,
        comments: updatedComments || item.comments || 'Completed shift work',
        completedAt: new Date().toISOString(),
        completedBy: assignedUser,
        operatorName: assignedUser,
        operatorId: assignedUserId || item.operatorId,
      }))

      // Remove from qms_serial_updates
      itemsToComplete.forEach((item) => {
        removeStoredSerialUpdate(item.serialNumber)
      })

      // 2. Store in completed collection/table (state + localStorage)
      setCompletedRecords((prev) => {
        const next = [...prev, ...completedEntries]
        try {
          localStorage.setItem('qms_completed_serial_records', JSON.stringify(next))
        } catch {
          // ignore storage error
        }
        return next
      })

      // 3. Remove selected serial numbers from the active table
      setSerialRecords((prev) => prev.filter((item) => !selectedSerialIds.has(item.id)))

      // 4. Background sync with backend API if applicable
      const sample = itemsToComplete[0]
      if (sample?.batchId && sample?.orderId) {
        const updates = itemsToComplete.map((r) => ({
          serialNumber: r.serialNumber,
          status: 'COMPLETED',
          completedPercent: 100,
          comments: updatedComments || r.comments,
          currentProcessStepName: r.processStepName,
          operatorName: assignedUser,
        }))
        updateBatchSerialsApi(sample.orderId, sample.batchId, {
          shift: selectedShift,
          updates,
        }).catch(() => {
          // Silently tolerate if mock or offline
        })
      }

      // 5. Clear selections and reset comment box
      setSelectedSerialIds(new Set())
      setFormComments('')
      toast.success(
        `Successfully marked ${selectedCount} serial(s) as Completed by ${assignedUser} and stored in completed collection!`,
      )
    } else {
      // Regular in-progress / status update (< 100%):
      // STRICT OVERRIDE: Both records are overridden with the current progress value (updatedPercent)
      const selectedItems = serialRecords.filter((r) => selectedSerialIds.has(r.id))

      // 1. Save all updated records into localStorage['qms_serial_updates'] so they persist across reloads
      selectedItems.forEach((item) => {
        saveStoredSerialUpdate({
          serialNumber: item.serialNumber,
          completedPercent: updatedPercent,
          status: updatedStatus,
          comments: updatedComments || item.comments,
          shift: selectedShift || item.shift,
          operatorName: assignedUser,
          planNo: item.planNo || selectedPlanNo,
          batchNo: item.batchNo || selectedBatchNo,
          productName: item.productName || selectedProject,
          processStepName: item.processStepName || selectedProcessStep,
          date: item.date || selectedDate,
          orderId: item.orderId,
          batchId: item.batchId,
          updatedAt: new Date().toISOString(),
        })
      })

      // 2. Remove any of these selected records from completedRecords if they were ever there
      const selectedNumbers = new Set(selectedItems.map((r) => r.serialNumber))
      setCompletedRecords((prev) => {
        const cleaned = prev.filter((c) => !selectedNumbers.has(c.serialNumber))
        try {
          localStorage.setItem('qms_completed_serial_records', JSON.stringify(cleaned))
        } catch {}
        return cleaned
      })

      // 3. Update active serial records in state
      setSerialRecords((prev) =>
        prev.map((item) => {
          if (selectedSerialIds.has(item.id)) {
            return {
              ...item,
              completedPercent: updatedPercent, // Overrides prior progress (e.g. 30% -> 50%)
              status: updatedStatus,           // Overrides status (e.g. IN_PROGRESS)
              comments: updatedComments || item.comments,
              operatorName: assignedUser,
              operatorId: assignedUserId || item.operatorId,
            }
          }
          return item
        }),
      )

      // 4. Also sync into batches in memory
      setBatches((prevBatches) =>
        prevBatches.map((b) => {
          if (!b.serials || b.serials.length === 0) return b
          const updatedSerials = b.serials.map((s) => {
            const matchRecord = selectedItems.find((r) => r.serialNumber === s.serialNumber)
            if (matchRecord) {
              return {
                ...s,
                status: updatedStatus,
                completedPercent: updatedPercent,
                comments: updatedComments || s.comments,
                operatorName: assignedUser,
              }
            }
            return s
          })
          return { ...b, serials: updatedSerials }
        }),
      )

      // 5. Background sync with backend if orderId & batchId are available
      const sample = selectedItems[0]
      if (sample?.batchId && sample?.orderId) {
        const updates = selectedItems.map((r) => ({
          serialNumber: r.serialNumber,
          status: updatedStatus,
          completedPercent: updatedPercent,
          comments: updatedComments || r.comments,
          currentProcessStepName: r.processStepName,
          operatorName: assignedUser,
        }))
        updateBatchSerialsApi(sample.orderId, sample.batchId, {
          shift: selectedShift,
          updates,
        }).catch(() => {
          // Silently tolerate if mock or offline
        })
      }

      // 6. Clear selections and comments after applying update so table displays updated rows cleanly
      setSelectedSerialIds(new Set())
      setFormComments('')
      toast.success(
        `Successfully updated ${selectedCount} serial record(s) to ${updatedPercent}% (${updatedStatus.replace(/_/g, ' ')}) by ${assignedUser}! Previous progress overridden with current value (${updatedPercent}%).`,
      )
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Global Alerts */}
      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-red-50/70 px-4 py-2.5 text-xs font-semibold text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} aria-label="Close error notice">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}


      {/* Top Section Divided into Two Columns */}
      <section className="rounded-2xl border border-border bg-surface-raised p-3.5 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Plan No, Batch, Project, Process Step, Shift, Get Details */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-3">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Select Production Plan & Shift
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
                  title="Refresh plans and batch list"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Date (Default current date) */}
                <div>
                  <label
                    htmlFor="dateInput"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    Date
                  </label>
                  <input
                    id="dateInput"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      try {
                        localStorage.setItem('qms_selected_date', e.target.value)
                      } catch {}
                    }}
                    className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                  />
                </div>

                {/* 2. Shift */}
                <div>
                  <label
                    htmlFor="shiftSelect"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    Shift
                  </label>
                  <select
                    id="shiftSelect"
                    value={selectedShift}
                    onChange={(e) => {
                      setSelectedShift(e.target.value)
                      try {
                        localStorage.setItem('qms_selected_shift', e.target.value)
                      } catch {}
                    }}
                    className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                  >
                    {shiftOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Plan No */}
                <div>
                  <label
                    htmlFor="planNoSelect"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    Plan No
                  </label>
                  <select
                    id="planNoSelect"
                    value={selectedPlanNo}
                    onChange={(e) => handlePlanNoChange(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                  >
                    {planNoOptions.length === 0 ? (
                      <option value="">No Plans Available</option>
                    ) : (
                      planNoOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 4. Batch */}
                <div>
                  <label
                    htmlFor="batchSelect"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    Batch
                  </label>
                  <select
                    id="batchSelect"
                    value={selectedBatchNo}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                  >
                    {batchOptions.length === 0 ? (
                      <option value="">No Batches Available</option>
                    ) : (
                      batchOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 5. Project */}
                <div>
                  <label
                    htmlFor="projectSelect"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    Project
                  </label>
                  <select
                    id="projectSelect"
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value)
                      try {
                        localStorage.setItem('qms_selected_project', e.target.value)
                      } catch {}
                    }}
                    className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                  >
                    {projectOptions.length === 0 ? (
                      <option value="">No Projects</option>
                    ) : (
                      projectOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 6. Process step */}
                <div>
                  <label
                    htmlFor="stepSelect"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    Process step
                  </label>
                  <select
                    id="stepSelect"
                    value={selectedProcessStep}
                    onChange={(e) => {
                      setSelectedProcessStep(e.target.value)
                      try {
                        localStorage.setItem('qms_selected_process_step', e.target.value)
                      } catch {}
                    }}
                    className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                  >
                    {processStepOptions.length === 0 ? (
                      <option value="CNC Machining">CNC Machining</option>
                    ) : (
                      processStepOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 7. Users (Searchable Single Select Dropdown) */}
                <div>
                  <SearchableSelect
                    id="userSelect"
                    label="Users"
                    size="xs"
                    placeholder="All Users / Search user..."
                    allowClear
                    options={userSelectOptions}
                    value={selectedUser}
                    onChange={(val) => {
                      setSelectedUser(val)
                      if (val && val !== 'All Users') {
                        setFormUser(val)
                        setToolUser(val)
                        setBreakdownUser(val)
                      } else {
                        setFormUser('')
                        setToolUser('')
                        setBreakdownUser('')
                      }
                      setFormUserError(null)
                      setToolUserError(null)
                      setBreakdownUserError(null)
                      try {
                        localStorage.setItem('qms_selected_user', val)
                      } catch {}
                    }}
                  />
                </div>

                {/* 8. Get Details Action Button */}
                <div>
                  <div className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-transparent select-none">
                    Action
                  </div>
                  <button
                    type="button"
                    onClick={handleGetDetails}
                    disabled={fetchingDetails}
                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-bold text-white shadow-sm hover:bg-accent/90 transition disabled:opacity-50"
                  >
                    <Search className={`h-3 w-3 ${fetchingDetails ? 'animate-spin' : ''}`} />
                    <span>Get Details</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Form based on Active Tab */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            {activeTab === 'WORK_UPDATE' ? (
              selectedSerialIds.size > 0 ? (
                <div className="flex h-full flex-col justify-between rounded-xl border border-accent/30 bg-accent/[0.04] p-3.5 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                          Update Progress
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {selectedSerialIds.size} Selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSerialIds(new Set())}
                          className="text-[10px] font-semibold text-muted hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {/* Assigned User / Operator Dropdown */}
                      <div>
                        <SearchableSelect
                          id="formUserSelect"
                          label="Assigned User / Operator"
                          size="xs"
                          placeholder="Select user / operator..."
                          options={formUserOptions}
                          value={formUser}
                          onChange={(val) => {
                            setFormUser(val)
                            setFormUserError(null)
                            setError(null)
                          }}
                          required
                          error={formUserError || undefined}
                        />
                        {formUserError && (
                          <p className="mt-1 text-[10px] font-semibold text-danger">
                            {formUserError}
                          </p>
                        )}
                      </div>

                      {/* % of completion as a Textbox instead of option buttons */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor="updatePercentInput"
                            className="text-[10px] font-bold uppercase tracking-wider text-muted"
                          >
                            % of Completion
                          </label>
                          <span className="font-mono text-[11px] font-extrabold text-accent">
                            {formCompletedPercent}%
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            id="updatePercentInput"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            placeholder="Enter % completion (0 - 100)"
                            value={formCompletedPercent}
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === '') {
                                setFormCompletedPercent(0)
                                setFormStatus('PLANNED')
                                return
                              }
                              const val = Math.min(100, Math.max(0, Number(raw) || 0))
                              setFormCompletedPercent(val)
                              if (val === 100) {
                                setFormStatus('COMPLETED')
                              } else if (val > 0) {
                                setFormStatus('IN_PROGRESS')
                              } else {
                                setFormStatus('PLANNED')
                              }
                            }}
                            className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 pr-7 text-xs font-bold text-foreground outline-none transition focus:border-accent"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                            %
                          </span>
                        </div>
                      </div>

                      {/* status dropdown */}
                      <div>
                        <label
                          htmlFor="updateStatusSelect"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                        >
                          Status
                        </label>
                        <select
                          id="updateStatusSelect"
                          value={formStatus}
                          onChange={(e) => {
                            const val = e.target.value
                            setFormStatus(val)
                            if (val === 'COMPLETED') {
                              setFormCompletedPercent(100)
                            } else if (val === 'PLANNED') {
                              setFormCompletedPercent(0)
                            } else if (val === 'IN_PROGRESS' && formCompletedPercent === 0) {
                              setFormCompletedPercent(50)
                            }
                          }}
                          className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                        >
                          <option value="PLANNED">Planned</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="QC_REJECTED">QC Rejected</option>
                        </select>
                      </div>

                      {/* comments */}
                      <div>
                        <label
                          htmlFor="updateCommentsInput"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                        >
                          Comments
                        </label>
                        <textarea
                          id="updateCommentsInput"
                          rows={2}
                          value={formComments}
                          onChange={(e) => setFormComments(e.target.value)}
                          placeholder="Add shift progress or handover notes..."
                          className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground outline-none transition focus:border-accent resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-border/80 mt-2.5 space-y-1.5">
                    {selectedSerialIds.size > 1 ? (
                      <p className="text-[10px] text-accent font-semibold text-center">
                        Updating {selectedSerialIds.size} queued serials in bulk to {formCompletedPercent}%
                      </p>
                    ) : hasSelectedInProgress ? (
                      <p className="text-[10px] text-amber-600 font-semibold text-center">
                        Updating single in-progress serial to {formCompletedPercent}%
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleApplyUpdate}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>
                        Apply Update ({selectedSerialIds.size} Serial{selectedSerialIds.size > 1 ? 's' : ''} → {formCompletedPercent}%)
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[190px] flex-col items-center justify-center rounded-xl border border-dashed border-border/90 bg-surface-muted/20 p-5 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-muted mb-2">
                    <CheckSquare className="h-4 w-4 text-muted" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    Update Serial Progress
                  </p>
                  <p className="mt-1 text-[11px] text-muted max-w-xs leading-relaxed">
                    Select one or more serial number records from the table below using the checkboxes
                    to update their <span className="font-semibold text-foreground">% of completion</span>,{' '}
                    <span className="font-semibold text-foreground">status dropdown</span>, and{' '}
                    <span className="font-semibold text-foreground">comments</span>.
                  </p>
                </div>
              )
            ) : activeTab === 'VIEW' ? (
              <div className="flex h-full flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5 shadow-sm">
                <div>
                  <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Completed Records Summary
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {viewCompletedRecords.length} Archived
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-lg bg-surface-muted/60 p-2.5 border border-border">
                      <div className="text-[10px] uppercase font-bold text-muted">Archive Mode</div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Completed Serials</span>
                        <span className="text-xs font-mono font-bold text-emerald-600">100% Finalized</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted leading-tight">
                        Viewing all completed and finalized items. These records are strictly read-only with no edit or delete actions.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-surface-muted/40 p-2 border border-border">
                        <span className="text-[10px] text-muted block uppercase font-bold">Current Shift</span>
                        <span className="font-semibold text-foreground truncate block">
                          {selectedShift.split(' (')[0] || 'Shift B'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-surface-muted/40 p-2 border border-border">
                        <span className="text-[10px] text-muted block uppercase font-bold">Active Batch</span>
                        <span className="font-semibold text-foreground truncate block">
                          {selectedBatchNo || 'B01'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/80 mt-2 text-center text-[10px] font-semibold text-muted">
                  Read-Only View • No edit/delete actions available
                </div>
              </div>
            ) : activeTab === 'TOOL_CHANGE' ? (
              <div className="flex h-full flex-col justify-between rounded-xl border border-accent/30 bg-accent/[0.04] p-3.5 shadow-sm">
                <div>
                  <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-accent" />
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Log Tool Change & Usage
                      </span>
                    </div>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      {filteredToolRecords.length} Logged
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Assigned User / Operator Dropdown */}
                    <div>
                      <SearchableSelect
                        id="toolUserSelect"
                        label="Assigned User / Operator"
                        size="xs"
                        placeholder="Select user / operator..."
                        options={formUserOptions}
                        value={toolUser}
                        onChange={(val) => {
                          setToolUser(val)
                          setToolUserError(null)
                          setError(null)
                        }}
                        required
                        error={toolUserError || undefined}
                      />
                      {toolUserError && (
                        <p className="mt-1 text-[10px] font-semibold text-danger">
                          {toolUserError}
                        </p>
                      )}
                    </div>

                    {/* Tool selection */}
                    <div>
                      <label
                        htmlFor="toolSelect"
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        Assigned Tool *
                      </label>
                      <select
                        id="toolSelect"
                        value={selectedToolCode}
                        onChange={(e) => setSelectedToolCode(e.target.value)}
                        className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                      >
                        <option value="">Select Assigned Tool...</option>
                        {ASSIGNED_TOOLS.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.code} — {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time & End Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="toolStartTimeInput"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                        >
                          Start Time *
                        </label>
                        <input
                          id="toolStartTimeInput"
                          type="time"
                          value={toolStartTime}
                          onChange={(e) => setToolStartTime(e.target.value)}
                          className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="toolEndTimeInput"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                        >
                          End Time *
                        </label>
                        <input
                          id="toolEndTimeInput"
                          type="time"
                          value={toolEndTime}
                          onChange={(e) => setToolEndTime(e.target.value)}
                          className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                        />
                      </div>
                    </div>

                    {/* Duration textbox (auto filled, non editable) */}
                    <div>
                      <label
                        htmlFor="toolDurationInput"
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        Duration (Auto-calculated, non-editable)
                      </label>
                      <input
                        id="toolDurationInput"
                        type="text"
                        readOnly
                        disabled
                        value={toolDuration}
                        placeholder="Auto-calculated from Start and End time"
                        className="h-8 w-full cursor-not-allowed rounded-lg border border-border/80 bg-surface-muted/70 px-2.5 text-xs font-bold text-accent outline-none"
                      />
                    </div>

                    {/* Remarks */}
                    <div>
                      <label
                        htmlFor="toolRemarksInput"
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        Notes / Tool Condition
                      </label>
                      <input
                        id="toolRemarksInput"
                        type="text"
                        value={toolRemarks}
                        onChange={(e) => setToolRemarks(e.target.value)}
                        placeholder="e.g. Edge wear observed, replaced insert..."
                        className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none transition focus:border-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/80 mt-2">
                  <button
                    type="button"
                    onClick={handleSubmitToolChange}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Submit Tool Usage</span>
                  </button>
                </div>
              </div>
            ) : (
              /* BREAKDOWN TAB */
              <div className="flex h-full flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3.5 shadow-sm">
                <div>
                  <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Log Machine Breakdown
                      </span>
                    </div>
                    <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {filteredBreakdownRecords.length} Logged
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Assigned User / Operator Dropdown */}
                    <div>
                      <SearchableSelect
                        id="breakdownUserSelect"
                        label="Assigned User / Operator"
                        size="xs"
                        placeholder="Select user / operator..."
                        options={formUserOptions}
                        value={breakdownUser}
                        onChange={(val) => {
                          setBreakdownUser(val)
                          setBreakdownUserError(null)
                          setError(null)
                        }}
                        required
                        error={breakdownUserError || undefined}
                      />
                      {breakdownUserError && (
                        <p className="mt-1 text-[10px] font-semibold text-danger">
                          {breakdownUserError}
                        </p>
                      )}
                    </div>

                    {/* Machine & Category */}
                    <div>
                      <label
                        htmlFor="breakdownCategorySelect"
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        Machine & Issue Category *
                      </label>
                      <select
                        id="breakdownCategorySelect"
                        value={breakdownCategory}
                        onChange={(e) => setBreakdownCategory(e.target.value)}
                        className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                      >
                        <option value="">Select Machine Issue Category...</option>
                        {BREAKDOWN_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {currentMachineCode} — {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time & End Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="breakdownStartTimeInput"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                        >
                          Start Time *
                        </label>
                        <input
                          id="breakdownStartTimeInput"
                          type="time"
                          value={breakdownStartTime}
                          onChange={(e) => setBreakdownStartTime(e.target.value)}
                          className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="breakdownEndTimeInput"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                        >
                          End Time *
                        </label>
                        <input
                          id="breakdownEndTimeInput"
                          type="time"
                          value={breakdownEndTime}
                          onChange={(e) => setBreakdownEndTime(e.target.value)}
                          className="h-8 w-full rounded-lg border border-border bg-surface-muted px-2 text-xs font-medium text-foreground outline-none transition focus:border-accent"
                        />
                      </div>
                    </div>

                    {/* Duration textbox (auto filled, non editable) */}
                    <div>
                      <label
                        htmlFor="breakdownDurationInput"
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        Duration (Auto-calculated, non-editable)
                      </label>
                      <input
                        id="breakdownDurationInput"
                        type="text"
                        readOnly
                        disabled
                        value={breakdownDuration}
                        placeholder="Auto-calculated from Start and End time"
                        className="h-8 w-full cursor-not-allowed rounded-lg border border-border/80 bg-surface-muted/70 px-2.5 text-xs font-bold text-amber-700 outline-none"
                      />
                    </div>

                    {/* Reason (Text area) */}
                    <div>
                      <label
                        htmlFor="breakdownReasonInput"
                        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        Reason * (Text area)
                      </label>
                      <textarea
                        id="breakdownReasonInput"
                        rows={2}
                        value={breakdownReason}
                        onChange={(e) => setBreakdownReason(e.target.value)}
                        placeholder="Describe root cause, alarm code, or action taken..."
                        className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground outline-none transition focus:border-accent resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/80 mt-2">
                  <button
                    type="button"
                    onClick={handleSubmitBreakdown}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Submit Breakdown</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Tabs: View, Work Update, Tool Change and Break Down */}
        <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-muted border border-border">
            {/* Tab 1: View */}
            <button
              type="button"
              onClick={() => setActiveTab('VIEW')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'VIEW'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  activeTab === 'VIEW'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-muted text-muted'
                }`}
              >
                {viewCompletedRecords.length}
              </span>
            </button>

            {/* Tab 2: Work Update */}
            <button
              type="button"
              onClick={() => setActiveTab('WORK_UPDATE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'WORK_UPDATE'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Work Update</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  activeTab === 'WORK_UPDATE'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-muted text-muted'
                }`}
              >
                {workUpdateRecords.length}
              </span>
            </button>

            {/* Tab 3: Tool Change */}
            <button
              type="button"
              onClick={() => setActiveTab('TOOL_CHANGE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'TOOL_CHANGE'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Tool Change</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  activeTab === 'TOOL_CHANGE'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-muted text-muted'
                }`}
              >
                {filteredToolRecords.length}
              </span>
            </button>

            {/* Tab 4: Break Down */}
            <button
              type="button"
              onClick={() => setActiveTab('BREAKDOWN')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'BREAKDOWN'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Break Down</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  activeTab === 'BREAKDOWN'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-muted text-muted'
                }`}
              >
                {filteredBreakdownRecords.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] font-medium text-muted hidden sm:block">
            {activeTab === 'VIEW' && 'Viewing completed & archived shift records (Read-Only)'}
            {activeTab === 'WORK_UPDATE' && 'Select serials from the table to log progress and status updates'}
            {activeTab === 'TOOL_CHANGE' && 'Log tool mounting, cutting duration and wear observations'}
            {activeTab === 'BREAKDOWN' && 'Log unexpected stoppages, reason and resolution duration'}
          </div>
        </div>
      </section>

      {/* Main Tab Content Tables */}
      <section className="flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        {/* TAB 1: VIEW (Read-Only Completed Records) */}
        {activeTab === 'VIEW' && (
          <div className="table-scroll table-scroll-fill">
            <div className="border-b border-border/80 px-4 py-2.5 bg-surface-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-foreground">Completed Records Archive</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  {viewCompletedRecords.length} Records
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium">
                Read-only archive of completed shift work
              </span>
            </div>

            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2.5">Serails Number</th>
                  <th className="px-3 py-2.5">Batch & Product</th>
                  <th className="px-3 py-2.5">ProcessName</th>
                  <th className="px-3 py-2.5">Shift</th>
                  <th className="px-3 py-2.5">Completed By / Operator</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">% Completion</th>
                  <th className="px-3 py-2.5">Comments</th>
                  <th className="px-3 py-2.5">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {viewCompletedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Eye className="h-7 w-7 text-muted/50" />
                        <p className="text-sm font-semibold text-foreground">
                          No completed records yet
                        </p>
                        <p className="text-xs text-muted max-w-sm">
                          When you select serial numbers in the <strong>Work Update</strong> tab, set their status to Completed, and apply update, they will be archived here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  viewCompletedRecords.map((row) => (
                    <tr key={row.id} className="transition hover:bg-surface-muted/30">
                      {/* Serails Number */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-accent">
                          {row.serialNumber}
                        </span>
                      </td>

                      {/* Batch & Product */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{row.batchNo}</div>
                        <div className="text-[11px] text-muted">{row.productName}</div>
                      </td>

                      {/* ProcessName */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-foreground">
                        {row.processName || row.processStepName}
                      </td>

                      {/* Shift */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-foreground">
                        {row.shift}
                      </td>

                      {/* Completed By / Operator */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {(() => {
                          const opName = row.completedBy || row.operatorName || ''
                          const opUser = usersList.find((u) => u.name === opName)
                          if (!opName) {
                            return <span className="text-muted text-xs">—</span>
                          }
                          return (
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground text-xs">{opName}</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                {opUser?.employeeCode && (
                                  <span className="font-mono bg-surface-muted px-1 rounded border border-border/60">
                                    {opUser.employeeCode}
                                  </span>
                                )}
                                <span>{opUser?.role || 'Operator'}</span>
                              </div>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          COMPLETED
                        </span>
                      </td>

                      {/* % Completion */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-[11px] font-bold text-emerald-600">
                            100%
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                            <div className="h-full bg-emerald-500 w-full" />
                          </div>
                        </div>
                      </td>

                      {/* Comments */}
                      <td className="px-3 py-2 max-w-[260px]">
                        <span className="truncate block text-xs text-muted" title={row.comments}>
                          {row.comments || 'Shift work completed'}
                        </span>
                      </td>

                      {/* Completed At */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted font-mono">
                        {row.completedAt ? new Date(row.completedAt).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: WORK UPDATE (Queued & In-Progress Serial Records with Actions) */}
        {activeTab === 'WORK_UPDATE' && (
          <div className="table-scroll table-scroll-fill">
            <div className="border-b border-border/80 px-4 py-2.5 bg-surface-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-foreground">Work Update: Queued & In-Progress Serials</span>
                <span className="rounded-full bg-accent/15 text-accent text-[10px] font-bold px-2 py-0.5">
                  {workUpdateRecords.length} Serials ({queuedRecords.length} Queued, {workUpdateRecords.length - queuedRecords.length} In-Progress)
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium">
                Queued serials support bulk selection. In-Progress serials must be updated individually.
              </span>
            </div>

            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllQueuedSelected}
                      onChange={handleToggleSelectAll}
                      disabled={queuedRecords.length === 0 || hasSelectedInProgress}
                      title={
                        hasSelectedInProgress
                          ? 'Multi-selection disabled while an In-Progress serial is selected'
                          : queuedRecords.length === 0
                          ? 'No queued records to select'
                          : 'Select all queued serials'
                      }
                      aria-label="Select all queued serials"
                      className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent disabled:opacity-40"
                    />
                  </th>
                  <th className="px-3 py-2.5">Serails Number</th>
                  <th className="px-3 py-2.5">ProcessName</th>
                  <th className="px-3 py-2.5">Shift</th>
                  <th className="px-3 py-2.5">Operator</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">% Completion</th>
                  <th className="px-3 py-2.5">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-accent" />
                        <span className="text-xs">Loading shift records...</span>
                      </div>
                    </td>
                  </tr>
                ) : workUpdateRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="h-7 w-7 text-muted/50" />
                        <p className="text-sm font-semibold text-foreground">
                          No queued or in-progress serial records found
                        </p>
                        <p className="text-xs text-muted">
                          All serials for this batch may be completed, or select another batch/plan and click <strong>Get Details</strong>.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  workUpdateRecords.map((row) => {
                    const isSelected = selectedSerialIds.has(row.id)
                    const isProg = isInProgressRecord(row)
                    const isSelectionBlocked =
                      !isSelected &&
                      (hasSelectedInProgress || (selectedSerialIds.size > 0 && isProg))

                    const disabledReason = isSelectionBlocked
                      ? hasSelectedInProgress
                        ? 'In-Progress serial selected. Unselect it to select other serials.'
                        : 'In-Progress serials cannot be multi-selected with Queued serials.'
                      : undefined

                    return (
                      <tr
                        key={row.id}
                        onClick={() => {
                          if (isSelectionBlocked) {
                            setError(disabledReason || 'Record cannot be selected.')
                            return
                          }
                          handleToggleRow(row.id)
                        }}
                        className={`transition ${
                          isSelectionBlocked
                            ? 'opacity-60 cursor-not-allowed bg-surface-muted/20'
                            : isSelected
                            ? 'cursor-pointer bg-accent/10 hover:bg-accent/15'
                            : 'cursor-pointer hover:bg-surface-muted/40'
                        }`}
                        title={disabledReason}
                      >
                        {/* Checkbox */}
                        <td
                          className="w-10 px-3 py-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isSelectionBlocked}
                            onChange={() => handleToggleRow(row.id)}
                            aria-label={`Select ${row.serialNumber}`}
                            title={disabledReason}
                            className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Serails Number */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-accent">
                            {row.serialNumber}
                          </span>
                        </td>

                        {/* ProcessName */}
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-foreground">
                          {row.processName || row.processStepName}
                        </td>

                        {/* Shift */}
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-foreground">
                          {row.shift || '—'}
                        </td>

                        {/* Operator */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {(() => {
                            const opName = row.operatorName || ''
                            const opUser = usersList.find((u) => u.name === opName)
                            if (!opName) {
                              return <span className="text-muted text-xs">—</span>
                            }
                            return (
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground text-xs">{opName}</span>
                                {opUser?.role && (
                                  <span className="text-[10px] text-muted">{opUser.role}</span>
                                )}
                              </div>
                            )
                          })()}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(
                              row.status,
                            )}`}
                          >
                            {row.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* % Completion */}
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[11px] font-bold text-foreground">
                              {row.completedPercent}%
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className="h-full bg-accent transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.completedPercent))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Comments */}
                        <td className="px-3 py-2 max-w-[260px]">
                          <span
                            className="truncate block text-xs text-muted"
                            title={row.comments}
                          >
                            {row.comments || '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: TOOL CHANGE (Logged Tool Usage Records) */}
        {activeTab === 'TOOL_CHANGE' && (
          <div className="table-scroll table-scroll-fill">
            <div className="border-b border-border/80 px-4 py-2.5 bg-surface-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-foreground">Tool Change & Usage Log</span>
                <span className="rounded-full bg-accent/15 text-accent text-[10px] font-bold px-2 py-0.5">
                  {filteredToolRecords.length} Logs
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium">
                Log of mounted tools, operational time, and wear remarks
              </span>
            </div>

            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2.5">Tool Code & Name</th>
                  <th className="px-3 py-2.5">Machine</th>
                  <th className="px-3 py-2.5">Operator</th>
                  <th className="px-3 py-2.5">Shift</th>
                  <th className="px-3 py-2.5 text-center">Start Time</th>
                  <th className="px-3 py-2.5 text-center">End Time</th>
                  <th className="px-3 py-2.5 text-center">Duration</th>
                  <th className="px-3 py-2.5">Notes / Wear Condition</th>
                  <th className="px-3 py-2.5">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredToolRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wrench className="h-7 w-7 text-muted/50" />
                        <p className="text-sm font-semibold text-foreground">
                          No tool change logs found for current selection
                        </p>
                        <p className="text-xs text-muted">
                          Select an assigned tool above, enter start/end times, and click <strong>Submit Tool Usage</strong>.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredToolRecords.map((t) => (
                    <tr key={t.id} className="transition hover:bg-surface-muted/30">
                      {/* Tool Code & Name */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-accent mr-2">
                          {t.toolCode}
                        </span>
                        <span className="font-semibold text-foreground">{t.toolName}</span>
                      </td>

                      {/* Machine */}
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">
                        {t.machineCode}
                      </td>

                      {/* Operator */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-foreground font-medium">
                        {t.operatorName || 'Floor Operator'}
                      </td>

                      {/* Shift */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-foreground">
                        {t.shift}
                      </td>

                      {/* Start Time */}
                      <td className="px-3 py-2 whitespace-nowrap text-center font-mono text-xs font-semibold text-foreground">
                        {t.startTime}
                      </td>

                      {/* End Time */}
                      <td className="px-3 py-2 whitespace-nowrap text-center font-mono text-xs font-semibold text-foreground">
                        {t.endTime}
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                          <Clock className="h-3 w-3" />
                          {t.duration}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-2 max-w-[240px]">
                        <span className="truncate block text-xs text-muted" title={t.remarks}>
                          {t.remarks || '—'}
                        </span>
                      </td>

                      {/* Logged At */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted font-mono">
                        {t.loggedAt}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: BREAK DOWN (Logged Machine Breakdown Records) */}
        {activeTab === 'BREAKDOWN' && (
          <div className="table-scroll table-scroll-fill">
            <div className="border-b border-border/80 px-4 py-2.5 bg-surface-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-foreground">Machine Breakdown & Stoppage Log</span>
                <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                  {filteredBreakdownRecords.length} Reports
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium">
                Log of unplanned stoppages, root causes, and resolution duration
              </span>
            </div>

            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2.5">Machine</th>
                  <th className="px-3 py-2.5">Issue Category</th>
                  <th className="px-3 py-2.5">Operator</th>
                  <th className="px-3 py-2.5 text-center">Start Time</th>
                  <th className="px-3 py-2.5 text-center">End Time</th>
                  <th className="px-3 py-2.5 text-center">Duration</th>
                  <th className="px-3 py-2.5">Reason / Action Taken</th>
                  <th className="px-3 py-2.5">Shift</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBreakdownRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertTriangle className="h-7 w-7 text-muted/50" />
                        <p className="text-sm font-semibold text-foreground">
                          No machine breakdown reports found for current selection
                        </p>
                        <p className="text-xs text-muted">
                          Report any unplanned stoppages using the breakdown form above.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBreakdownRecords.map((b) => (
                    <tr key={b.id} className="transition hover:bg-surface-muted/30">
                      {/* Machine */}
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs font-bold text-accent">
                        {b.machineCode}
                      </td>

                      {/* Issue Category */}
                      <td className="px-3 py-2 whitespace-nowrap font-semibold text-foreground">
                        {b.category}
                      </td>

                      {/* Operator */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-foreground font-medium">
                        {b.operatorName || 'Floor Operator'}
                      </td>

                      {/* Start Time */}
                      <td className="px-3 py-2 whitespace-nowrap text-center font-mono text-xs font-semibold text-foreground">
                        {b.startTime}
                      </td>

                      {/* End Time */}
                      <td className="px-3 py-2 whitespace-nowrap text-center font-mono text-xs font-semibold text-foreground">
                        {b.endTime}
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold">
                          <Clock className="h-3 w-3" />
                          {b.duration}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-3 py-2 max-w-[280px]">
                        <span className="truncate block text-xs text-foreground" title={b.reason}>
                          {b.reason}
                        </span>
                      </td>

                      {/* Shift */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted">
                        {b.shift}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {b.status}
                        </span>
                      </td>

                      {/* Logged At */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted font-mono">
                        {b.loggedAt}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
