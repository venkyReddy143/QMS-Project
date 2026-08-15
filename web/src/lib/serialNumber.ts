/**
 * Serial number configuration
 * ---------------------------------------------------------
 * Change SERIAL_NUMBER_CONFIG to update format plant-wide.
 *
 * Supported tokens in `pattern`:
 *   {PREFIX}  - product family / plant prefix
 *   {YEAR}    - 4-digit year
 *   {ORDER}   - order sequence extracted from order id
 *   {BATCH}   - batch number (padded)
 *   {SEQ}     - piece sequence inside the order (padded)
 *
 * Current example:
 *   TB-HP-2026-0041-B01-0001
 *
 * To change later, edit only this file (pattern / padding / prefix).
 */
export const SERIAL_NUMBER_CONFIG = {
  /** Product / plant prefix used in every serial */
  prefix: 'TB-HP',
  /** Full pattern template — edit this to change format later */
  pattern: '{PREFIX}-{YEAR}-{ORDER}-B{BATCH}-{SEQ}',
  /** Digits for batch number (B01, B02...) */
  batchPad: 2,
  /** Digits for piece sequence (0001, 0002...) */
  sequencePad: 4,
  /** Digits for order sequence segment */
  orderPad: 4,
  /** Use calendar year in serial */
  includeYear: true,
} as const

export type SerialNumberConfig = typeof SERIAL_NUMBER_CONFIG

export interface GeneratedSerial {
  id: string
  serialNumber: string
  orderId: string
  batchId: string
  sequence: number
}

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0')
}

/** Extract trailing digits from order id, e.g. PO-2026-0041 → 0041 */
export function extractOrderSequence(orderId: string): string {
  const match = orderId.match(/(\d+)(?!.*\d)/)
  const raw = match?.[1] ?? '0'
  return pad(Number(raw), SERIAL_NUMBER_CONFIG.orderPad)
}

export function formatSerialNumber(params: {
  orderId: string
  batchNumber: number
  sequence: number
  year?: number
  config?: Partial<SerialNumberConfig>
}): string {
  const config = { ...SERIAL_NUMBER_CONFIG, ...params.config }
  const year = String(params.year ?? new Date().getFullYear())

  const replacements: Record<string, string> = {
    '{PREFIX}': config.prefix,
    '{YEAR}': config.includeYear ? year : '',
    '{ORDER}': extractOrderSequence(params.orderId),
    '{BATCH}': pad(params.batchNumber, config.batchPad),
    '{SEQ}': pad(params.sequence, config.sequencePad),
  }

  let serial: string = config.pattern
  for (const [token, value] of Object.entries(replacements)) {
    serial = serial.split(token).join(value)
  }

  return serial.replace(/--+/g, '-').replace(/^-|-$/g, '')
}

export function buildBatchSerials(params: {
  orderId: string
  batchId: string
  batchNumber: number
  quantity: number
  startSequence?: number
}): { serials: GeneratedSerial[]; nextSequence: number } {
  const start = params.startSequence ?? 1
  const serials = Array.from({ length: params.quantity }, (_, index) => {
    const sequence = start + index
    return {
      id: `${params.batchId}-sn-${sequence}`,
      serialNumber: formatSerialNumber({
        orderId: params.orderId,
        batchNumber: params.batchNumber,
        sequence,
      }),
      orderId: params.orderId,
      batchId: params.batchId,
      sequence,
    }
  })

  return { serials, nextSequence: start + params.quantity }
}

export function getSerialFormatExample(orderId = 'PO-2026-0041'): string {
  return formatSerialNumber({
    orderId,
    batchNumber: 1,
    sequence: 1,
  })
}
