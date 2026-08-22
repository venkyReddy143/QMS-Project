export const SERIAL_NUMBER_CONFIG = {
  prefix: 'TB-HP',
  pattern: '{PREFIX}-{YEAR}-{ORDER}-B{BATCH}-{SEQ}',
  batchPad: 2,
  sequencePad: 4,
  orderPad: 4,
} as const

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0')
}

export function extractOrderSequence(orderNo: string): string {
  const match = orderNo.match(/(\d+)(?!.*\d)/)
  return pad(Number(match?.[1] ?? '0'), SERIAL_NUMBER_CONFIG.orderPad)
}

export function parseBatchNumber(batchNo: string): number {
  const match = batchNo.match(/(\d+)\s*$/)
  return match ? Number(match[1]) : 1
}

export function formatSerialNumber(params: {
  orderNo: string
  batchNumber: number
  sequence: number
  year?: number
}): string {
  const year = String(params.year ?? new Date().getFullYear())
  const replacements: Record<string, string> = {
    '{PREFIX}': SERIAL_NUMBER_CONFIG.prefix,
    '{YEAR}': year,
    '{ORDER}': extractOrderSequence(params.orderNo),
    '{BATCH}': pad(params.batchNumber, SERIAL_NUMBER_CONFIG.batchPad),
    '{SEQ}': pad(params.sequence, SERIAL_NUMBER_CONFIG.sequencePad),
  }

  let serial: string = SERIAL_NUMBER_CONFIG.pattern
  for (const [token, value] of Object.entries(replacements)) {
    serial = serial.split(token).join(value)
  }

  return serial.replace(/--+/g, '-').replace(/^-|-$/g, '')
}

export function buildBatchSerials(params: {
  orderNo: string
  batchNo: string
  quantity: number
  startSequence?: number
}) {
  const start = params.startSequence ?? 1
  const batchNumber = parseBatchNumber(params.batchNo)

  return Array.from({ length: params.quantity }, (_, index) => {
    const sequence = start + index
    return {
      serialNumber: formatSerialNumber({
        orderNo: params.orderNo,
        batchNumber,
        sequence,
      }),
      sequence,
      status: 'QUEUED' as const,
    }
  })
}
