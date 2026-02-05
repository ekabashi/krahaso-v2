import type { Vehicle, BookingOptions, BookingResponse } from '~/types'
import { useBookingStore } from '~/stores/bookingStore'

export function useCheckoutVehicle() {
  const bookingStore = useBookingStore()

  const vehicle = useState<Vehicle | null>('checkout-vehicle', () => null)
  const bookingResponse = useState<BookingResponse | null>(
    'checkout-booking-response',
    () => null,
  )

  const tenantId = computed(() => vehicle.value?.tenant_id)

  const bookingOptions = computed<BookingOptions | undefined>(() =>
    bookingStore.optionsForTenant(tenantId.value),
  )

  function setVehicle(selectedVehicle: Vehicle) {
    vehicle.value = selectedVehicle
  }

  function setBookingResponse(response: BookingResponse) {
    bookingResponse.value = response
  }

  async function loadBookingData(): Promise<void> {
    if (!tenantId.value) return
    await Promise.all([
      bookingStore.fetchOptions(tenantId.value),
      bookingStore.fetchAddressPoints(tenantId.value),
    ])
  }

  function resetVehicle() {
    vehicle.value = null
    bookingResponse.value = null
  }

  return {
    vehicle,
    bookingResponse,
    tenantId,
    bookingOptions,
    setVehicle,
    setBookingResponse,
    loadBookingData,
    resetVehicle,
  }
}
