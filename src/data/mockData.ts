import type {
  Batch,
  DomainSnapshot,
  Machine,
  MachineType,
  PieceSerial,
  ProcessStep,
  ProcessStepCode,
  ProductionOrder,
  Shift,
} from '../types/production'

export const processSteps: ProcessStep[] = [
  {
    id: 'step-casting',
    code: 'CASTING',
    name: 'Casting',
    sequence: 1,
    standardHours: 0.45,
    machineTypeId: 'mt-furnace',
  },
  {
    id: 'step-cnc',
    code: 'CNC',
    name: 'CNC Machining',
    sequence: 2,
    standardHours: 2.5,
    machineTypeId: 'mt-cnc',
  },
  {
    id: 'step-coating',
    code: 'COATING',
    name: 'Coating',
    sequence: 3,
    standardHours: 0.8,
    machineTypeId: 'mt-coating',
  },
  {
    id: 'step-ndt',
    code: 'NDT',
    name: 'NDT Testing',
    sequence: 4,
    standardHours: 0.3,
    machineTypeId: 'mt-ndt',
  },
  {
    id: 'step-final',
    code: 'FINAL_INSPECTION',
    name: 'Final Inspection',
    sequence: 5,
    standardHours: 0.2,
    machineTypeId: 'mt-inspection',
  },
  {
    id: 'step-packing',
    code: 'PACKING',
    name: 'Packing',
    sequence: 6,
    standardHours: 0.15,
    machineTypeId: 'mt-packing',
  },
]

export const machineTypes: MachineType[] = [
  {
    id: 'mt-furnace',
    code: 'FURNACE',
    name: 'Investment Casting Furnace',
    description: 'High-temp casting cells for rotor blade blanks',
  },
  {
    id: 'mt-cnc',
    code: 'CNC',
    name: '5-Axis CNC Machining Center',
    description: 'Precision airfoil machining',
  },
  {
    id: 'mt-coating',
    code: 'COATING',
    name: 'Thermal Barrier Coating Line',
    description: 'Bond coat and TBC application',
  },
  {
    id: 'mt-ndt',
    code: 'NDT',
    name: 'NDT / Ultrasonic Cell',
    description: 'Non-destructive integrity verification',
  },
  {
    id: 'mt-inspection',
    code: 'INSPECTION',
    name: 'Final Metrology Station',
    description: 'Dimensional and visual release inspection',
  },
  {
    id: 'mt-packing',
    code: 'PACKING',
    name: 'Pack & Preserve Cell',
    description: 'Conservation packaging for dispatch',
  },
]

export const machines: Machine[] = [
  {
    id: 'mch-cnc-01',
    code: 'CNC-01',
    name: 'CNC Cell 01',
    machineTypeId: 'mt-cnc',
    status: 'running',
    shiftCapacityHours: 7.5,
  },
  {
    id: 'mch-cnc-02',
    code: 'CNC-02',
    name: 'CNC Cell 02',
    machineTypeId: 'mt-cnc',
    status: 'available',
    shiftCapacityHours: 7.5,
  },
  {
    id: 'mch-furn-01',
    code: 'FURN-01',
    name: 'Furnace Line 01',
    machineTypeId: 'mt-furnace',
    status: 'running',
    shiftCapacityHours: 8,
  },
]

export const shifts: Shift[] = [
  {
    id: 'shift-a',
    code: 'A',
    name: 'Shift A',
    startTime: '06:00',
    endTime: '14:00',
    hours: 8,
  },
  {
    id: 'shift-b',
    code: 'B',
    name: 'Shift B',
    startTime: '14:00',
    endTime: '22:00',
    hours: 8,
  },
  {
    id: 'shift-c',
    code: 'C',
    name: 'Shift C',
    startTime: '22:00',
    endTime: '06:00',
    hours: 8,
  },
]

export const productionOrders: ProductionOrder[] = [
  {
    id: 'po-2026-0041',
    orderNumber: 'PO-2026-0041',
    partNumber: 'TB-HP-STAGE1',
    partDescription: '500 HP Stage-1 Rotor Blades',
    customer: 'AeroDyn Turbines Ltd.',
    quantity: 500,
    dueDate: '2026-09-30',
    status: 'in_progress',
    priority: 'critical',
  },
]

export const batches: Batch[] = [
  {
    id: 'batch-1',
    batchNumber: 'Batch 1',
    productionOrderId: 'po-2026-0041',
    quantity: 100,
    status: 'in_progress',
    plannedStart: '2026-08-10',
    plannedEnd: '2026-08-22',
  },
  {
    id: 'batch-2',
    batchNumber: 'Batch 2',
    productionOrderId: 'po-2026-0041',
    quantity: 200,
    status: 'released',
    plannedStart: '2026-08-18',
    plannedEnd: '2026-09-05',
  },
  {
    id: 'batch-3',
    batchNumber: 'Batch 3',
    productionOrderId: 'po-2026-0041',
    quantity: 200,
    status: 'planned',
    plannedStart: '2026-08-28',
    plannedEnd: '2026-09-20',
  },
]

const STEP_FLOW: ProcessStepCode[] = [
  'CASTING',
  'CNC',
  'COATING',
  'NDT',
  'FINAL_INSPECTION',
  'PACKING',
]

function resolveBatchId(serialIndex: number): string {
  if (serialIndex <= 100) return 'batch-1'
  if (serialIndex <= 300) return 'batch-2'
  return 'batch-3'
}

function resolveProgress(serialIndex: number): {
  currentStepCode: ProcessStepCode | null
  completedStepCodes: ProcessStepCode[]
} {
  if (serialIndex <= 40) {
    return {
      currentStepCode: 'CNC',
      completedStepCodes: ['CASTING'],
    }
  }

  if (serialIndex <= 80) {
    return {
      currentStepCode: 'CASTING',
      completedStepCodes: [],
    }
  }

  if (serialIndex <= 100) {
    return {
      currentStepCode: 'COATING',
      completedStepCodes: ['CASTING', 'CNC'],
    }
  }

  if (serialIndex <= 180) {
    return {
      currentStepCode: 'CASTING',
      completedStepCodes: [],
    }
  }

  return {
    currentStepCode: null,
    completedStepCodes: [],
  }
}

function buildPieceSerials(): PieceSerial[] {
  return Array.from({ length: 500 }, (_, index) => {
    const serialIndex = index + 1
    const padded = String(serialIndex).padStart(4, '0')
    const progress = resolveProgress(serialIndex)

    return {
      id: `serial-${padded}`,
      serialNumber: `TB-HP-001-${padded}`,
      productionOrderId: 'po-2026-0041',
      batchId: resolveBatchId(serialIndex),
      currentStepCode: progress.currentStepCode,
      completedStepCodes: progress.completedStepCodes,
    }
  })
}

export const pieceSerials = buildPieceSerials()

export const domainSnapshot: DomainSnapshot = {
  productionOrders,
  batches,
  processSteps,
  machineTypes,
  machines,
  shifts,
  pieceSerials,
}

export const activeProductionOrder = productionOrders[0]

export const totalStandardHoursPerPiece = processSteps.reduce(
  (sum, step) => sum + step.standardHours,
  0,
)

export function getBatchSerials(batchId: string): PieceSerial[] {
  return pieceSerials.filter((serial) => serial.batchId === batchId)
}

export function getStepByCode(code: ProcessStepCode): ProcessStep | undefined {
  return processSteps.find((step) => step.code === code)
}

export function getProcessRouteLabel(): string {
  return [...processSteps]
    .sort((a, b) => a.sequence - b.sequence)
    .map((step) => `${step.name} (${step.standardHours.toFixed(2)}h)`)
    .join(' → ')
}

export { STEP_FLOW }
