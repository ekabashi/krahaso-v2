import type {
  Vehicle,
  BookingFormData,
  BookingResponse,
  BookingOptions,
  AddressPoint,
} from '~/types'
import { useCheckoutStep } from './checkout/useCheckoutStep'
import { useCheckoutDates } from './checkout/useCheckoutDates'
import { useCheckoutLocations } from './checkout/useCheckoutLocations'
import {
  useCheckoutCustomer,
  type CustomerFormState,
} from './checkout/useCheckoutCustomer'
import {
  useCheckoutOptions,
  type CheckoutOptionsState,
} from './checkout/useCheckoutOptions'
import { useCheckoutVehicle } from './checkout/useCheckoutVehicle'
import { useBookingStore } from '~/stores/bookingStore'

export interface CheckoutState {
  vehicle: Vehicle | null
  step: number
  samePickupReturn: boolean
  selectedDates: { start: Date | null; end: Date | null }
  selectedTimes: { start: string; end: string }
  pickupPoint: string
  returnPoint: string
  customerForm: CustomerFormState
  selectedDocument: 'id' | 'passport'
  options: CheckoutOptionsState
  description: string
  isCustomerExist: boolean
  bookingResponse: BookingResponse | null
}

export function useCheckout() {
  const toast = useToast()
  const bookingStore = useBookingStore()

  const stepComposable = useCheckoutStep()
  const datesComposable = useCheckoutDates()
  const locationsComposable = useCheckoutLocations()
  const customerComposable = useCheckoutCustomer()
  const optionsComposable = useCheckoutOptions()
  const vehicleComposable = useCheckoutVehicle()

  const bookingOptions = computed<BookingOptions | undefined>(() =>
    bookingStore.optionsForTenant(vehicleComposable.tenantId.value),
  )

  const addressPoints = computed<AddressPoint[]>(() => {
    const items = bookingStore.addressForTenant(
      vehicleComposable.tenantId.value,
    )
    return items ?? []
  })

  const state = computed<CheckoutState>(() => ({
    vehicle: vehicleComposable.vehicle.value,
    step: stepComposable.step.value,
    samePickupReturn: locationsComposable.samePickupReturn.value,
    selectedDates: datesComposable.selectedDates.value,
    selectedTimes: datesComposable.selectedTimes.value,
    pickupPoint: locationsComposable.pickupPoint.value,
    returnPoint: locationsComposable.returnPoint.value,
    customerForm: customerComposable.customerForm.value,
    selectedDocument: customerComposable.selectedDocument.value,
    options: optionsComposable.options.value,
    description: optionsComposable.description.value,
    isCustomerExist: customerComposable.isCustomerExist.value,
    bookingResponse: vehicleComposable.bookingResponse.value,
  }))

  function initializeCheckout(
    vehicle: Vehicle,
    dates?: { start: Date | null; end: Date | null },
    times?: { start: string; end: string },
  ) {
    vehicleComposable.setVehicle(vehicle)
    stepComposable.resetStep()
    if (dates) datesComposable.setDates(dates.start, dates.end)
    if (times) datesComposable.setTimes(times.start, times.end)
    if (addressPoints.value.length > 0) {
      locationsComposable.initializeLocations(addressPoints.value)
    }
  }

  async function loadBookingData(tenantId: number) {
    await Promise.all([
      bookingStore.fetchOptions(tenantId),
      bookingStore.fetchAddressPoints(tenantId),
    ])
    if (addressPoints.value.length > 0) {
      locationsComposable.initializeLocations(addressPoints.value)
    }
  }

  async function checkCustomerByEmail(email: string): Promise<boolean> {
    const tenantId = vehicleComposable.tenantId.value
    if (!tenantId) return false
    return customerComposable.checkCustomerByEmail(tenantId, email)
  }

  function nextStep() {
    stepComposable.nextStep(customerComposable.isCustomerExist.value)
  }

  function prevStep() {
    stepComposable.prevStep(customerComposable.isCustomerExist.value)
  }

  function goToStep(step: number) {
    stepComposable.goToStep(step, customerComposable.isCustomerExist.value)
  }

  function resetCheckout() {
    vehicleComposable.resetVehicle()
    stepComposable.resetStep()
    datesComposable.resetDates()
    locationsComposable.resetLocations()
    customerComposable.resetCustomerForm()
    optionsComposable.resetOptions()
  }

  function updateDateTime() {
    return datesComposable.getDateTime()
  }

  function submitBooking(): BookingFormData | null {
    const vehicle = vehicleComposable.vehicle.value
    if (!vehicle) {
      toast.add({
        title: 'Error',
        description: 'Vehicle information is missing',
        color: 'error',
      })
      return null
    }
    const dateTime = datesComposable.getDateTime()
    if (!dateTime) {
      toast.add({
        title: 'Error',
        description: 'Please select valid dates and times',
        color: 'error',
      })
      return null
    }
    const customerForm = customerComposable.customerForm.value
    const options = optionsComposable.options.value
    const bookingData: BookingFormData = {
      vehicle_id: vehicle.id,
      tenant_id: vehicle.tenant_id,
      pickupPoint: locationsComposable.pickupPoint.value,
      returnPoint: locationsComposable.returnPoint.value,
      startDateTime: dateTime.startDateTime.toISOString(),
      endDateTime: dateTime.endDateTime.toISOString(),
      options,
      customer: {
        name: customerForm.name,
        surname: customerForm.surname,
        email: customerForm.email,
        phone: customerForm.phone,
        address: customerForm.address,
        PersonalNr: customerForm.PersonalNr,
        licenseClasses: customerForm.licenseClasses,
        frontIdFile: null,
        backIdFile: null,
        passportFile: null,
        patentShoferFile: null,
      },
      description: optionsComposable.description.value,
    }
    return bookingData
  }

  return {
    state,
    bookingOptions,
    addressPoints,
    pickupPlaceOptions: locationsComposable.pickupPlaceOptions,
    returnPlaceOptions: locationsComposable.returnPlaceOptions,
    initializeCheckout,
    loadBookingData,
    checkCustomerByEmail,
    nextStep,
    prevStep,
    goToStep,
    resetCheckout,
    updateDateTime,
    submitBooking,
    step: stepComposable,
    dates: datesComposable,
    locations: locationsComposable,
    customer: customerComposable,
    options: optionsComposable,
    vehicle: vehicleComposable,
  }
}
