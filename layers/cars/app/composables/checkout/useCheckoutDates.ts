export interface CheckoutDatesState {
  start: Date | null
  end: Date | null
}

export interface CheckoutTimesState {
  start: string
  end: string
}

export function useCheckoutDates() {
  const selectedDates = useState<CheckoutDatesState>('checkout-dates', () => ({
    start: null,
    end: null,
  }))

  const selectedTimes = useState<CheckoutTimesState>('checkout-times', () => ({
    start: '',
    end: '',
  }))

  const rentalDays = computed(() => {
    if (!selectedDates.value.start || !selectedDates.value.end) return 0
    const diffTime = Math.abs(
      selectedDates.value.end.getTime() - selectedDates.value.start.getTime(),
    )
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1
  })

  const isValidDateRange = computed(
    () =>
      selectedDates.value.start !== null &&
      selectedDates.value.end !== null &&
      selectedTimes.value.start !== '' &&
      selectedTimes.value.end !== '',
  )

  function setDates(start: Date | null, end: Date | null) {
    selectedDates.value = { start, end }
  }

  function setTimes(start: string, end: string) {
    selectedTimes.value = { start, end }
  }

  function applyTimeToDate(date: Date, timeString: string): Date {
    const result = new Date(date)
    const timeParts = timeString.split(':')
    if (timeParts.length === 2 && timeParts[0] && timeParts[1]) {
      result.setHours(parseInt(timeParts[0]) || 0)
      result.setMinutes(parseInt(timeParts[1]) || 0)
    }
    return result
  }

  function getDateTime(): { startDateTime: Date; endDateTime: Date } | null {
    if (!isValidDateRange.value) return null
    const startDateTime = applyTimeToDate(
      selectedDates.value.start!,
      selectedTimes.value.start,
    )
    const endDateTime = applyTimeToDate(
      selectedDates.value.end!,
      selectedTimes.value.end,
    )
    return { startDateTime, endDateTime }
  }

  function resetDates() {
    selectedDates.value = { start: null, end: null }
    selectedTimes.value = { start: '', end: '' }
  }

  return {
    selectedDates,
    selectedTimes,
    rentalDays,
    isValidDateRange,
    setDates,
    setTimes,
    getDateTime,
    resetDates,
  }
}
