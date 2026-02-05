export interface CheckoutOptionsState {
  secondDriver: boolean
  gps: boolean
  maksikos: boolean
  greenCard: boolean
  europeanCard: boolean
  roadAssistance: boolean
  outOfKosovo: boolean
}

function getDefaultOptions(): CheckoutOptionsState {
  return {
    secondDriver: false,
    gps: false,
    maksikos: false,
    greenCard: false,
    europeanCard: false,
    roadAssistance: false,
    outOfKosovo: false,
  }
}

export function useCheckoutOptions() {
  const options = useState<CheckoutOptionsState>(
    'checkout-options',
    getDefaultOptions,
  )
  const description = useState<string>('checkout-description', () => '')

  const selectedOptionsCount = computed(() =>
    Object.values(options.value).filter(Boolean).length,
  )

  function toggleOption(optionName: keyof CheckoutOptionsState) {
    options.value[optionName] = !options.value[optionName]
  }

  function setOption(optionName: keyof CheckoutOptionsState, value: boolean) {
    options.value[optionName] = value
  }

  function setDescription(text: string) {
    description.value = text
  }

  function resetOptions() {
    options.value = getDefaultOptions()
    description.value = ''
  }

  return {
    options,
    description,
    selectedOptionsCount,
    toggleOption,
    setOption,
    setDescription,
    resetOptions,
  }
}
