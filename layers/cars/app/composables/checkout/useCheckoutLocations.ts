import type { AddressPoint } from '~/types'

export function useCheckoutLocations() {
  const pickupPoint = useState<string>('checkout-pickup', () => '')
  const returnPoint = useState<string>('checkout-return', () => '')
  const samePickupReturn = useState<boolean>('checkout-same-location', () => true)
  const addressPoints = useState<AddressPoint[]>('checkout-address-points', () => [])

  const pickupPlaceOptions = computed(() => {
    if (!addressPoints.value.length) return []
    return addressPoints.value.map(
      (point) =>
        point.adress || `${point.city ?? ''} ${point.zip ?? ''}`.trim(),
    )
  })

  const returnPlaceOptions = computed(() => pickupPlaceOptions.value)

  function initializeLocations(points: AddressPoint[]) {
    addressPoints.value = points
    if (points.length > 0) {
      const defaultPoint = pickupPlaceOptions.value[0] ?? ''
      pickupPoint.value = defaultPoint
      returnPoint.value = defaultPoint
    }
  }

  function setPickupPoint(point: string) {
    pickupPoint.value = point
    if (samePickupReturn.value) {
      returnPoint.value = point
    }
  }

  function setReturnPoint(point: string) {
    returnPoint.value = point
  }

  function toggleSamePickupReturn() {
    samePickupReturn.value = !samePickupReturn.value
    if (samePickupReturn.value) {
      returnPoint.value = pickupPoint.value
    }
  }

  function resetLocations() {
    pickupPoint.value = ''
    returnPoint.value = ''
    samePickupReturn.value = true
    addressPoints.value = []
  }

  return {
    pickupPoint,
    returnPoint,
    samePickupReturn,
    addressPoints,
    pickupPlaceOptions,
    returnPlaceOptions,
    initializeLocations,
    setPickupPoint,
    setReturnPoint,
    toggleSamePickupReturn,
    resetLocations,
  }
}
