<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'

/** Range for calendar value; matches UCalendar emit (start/end can be undefined) */
type CalendarDateRange = { start?: DateValue; end?: DateValue }

const props = withDefaults(
  defineProps<{
    modelValue: { start: Date | null; end: Date | null }
    todayDate?: boolean
    numberOfMonths?: number
  }>(),
  { todayDate: false, numberOfMonths: 2 },
)

const emit = defineEmits<{
  'update:modelValue': [value: { start: Date | null; end: Date | null }]
  close: []
}>()

const today = new Date()
today.setHours(0, 0, 0, 0)

const defaultCalendarDate = new CalendarDate(
  today.getFullYear(),
  today.getMonth() + 1,
  today.getDate(),
)

const minValue = computed(() => {
  if (!props.todayDate) return undefined
  return defaultCalendarDate
})

function dateToCalendarDate(d: Date | null): CalendarDate | undefined {
  if (!d || Number.isNaN(d.getTime())) return undefined
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function calendarDateToDate(c: CalendarDate): Date {
  const d = c.toDate(getLocalTimeZone())
  d.setHours(0, 0, 0, 0)
  return d
}

const calendarValue = computed({
  get(): { start: CalendarDate; end: CalendarDate } {
    const start = dateToCalendarDate(props.modelValue.start)
    const end = dateToCalendarDate(props.modelValue.end)
    const startCal = start ?? defaultCalendarDate
    const endCal = end ?? defaultCalendarDate
    return { start: startCal, end: endCal }
  },
  set(value: CalendarDateRange | undefined) {
    if (!value?.start) return
    const startDate = calendarDateToDate(value.start as CalendarDate)
    let endDate: Date | null = null
    if (value.end) {
      endDate = calendarDateToDate(value.end as CalendarDate)
    }
    emit('update:modelValue', { start: startDate, end: endDate })
    if (endDate && startDate.getTime() !== endDate.getTime()) {
      requestAnimationFrame(() => emit('close'))
    }
  },
})

function handleUpdate(value: CalendarDateRange | null) {
  if (value?.start) calendarValue.value = value as { start: CalendarDate; end: CalendarDate }
}
</script>

<template>
  <div class="relative z-9999 p-2">
    <UCalendar
      :model-value="calendarValue"
      range
      :number-of-months="numberOfMonths"
      :min-value="minValue"
      :week-starts-on="2"
      @update:model-value="handleUpdate"
    />
  </div>
</template>
