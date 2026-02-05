<script setup lang="ts">
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DateRange } from '@internationalized/date'

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
  get(): DateRange {
    const start = dateToCalendarDate(props.modelValue.start)
    const end = dateToCalendarDate(props.modelValue.end)
    const startCal = start ?? defaultCalendarDate
    const endCal = end ?? defaultCalendarDate
    return { start: startCal, end: endCal }
  },
  set(value: DateRange | undefined) {
    if (!value?.start) return
    const startDate = calendarDateToDate(value.start)
    let endDate: Date | null = null
    if (value.end) {
      endDate = calendarDateToDate(value.end)
    }
    emit('update:modelValue', { start: startDate, end: endDate })
    if (endDate && startDate.getTime() !== endDate.getTime()) {
      requestAnimationFrame(() => emit('close'))
    }
  },
})

function handleUpdate(value: DateRange) {
  calendarValue.value = value
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
