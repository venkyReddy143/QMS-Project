import mongoose, { Schema } from 'mongoose'
import { MASTER_STATUSES, type MasterStatus } from '../constants/enums'

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type Weekday = (typeof WEEKDAYS)[number]

export interface ICalendar {
  name: string
  workingDays: Weekday[]
  status: MasterStatus
}

const calendarSchema = new Schema<ICalendar>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    workingDays: {
      type: [String],
      enum: WEEKDAYS,
      required: true,
      default: () => [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ],
    },
    status: {
      type: String,
      enum: MASTER_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
  },
  { timestamps: true },
)

export const Calendar = mongoose.model<ICalendar>('Calendar', calendarSchema)
