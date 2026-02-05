/**
 * Step navigation state machine for checkout flow
 */
export function useCheckoutStep() {
  const step = useState<number>('checkout-step', () => 1)

  const isFirstStep = computed(() => step.value === 1)
  const isLastStep = computed(() => step.value === 5)

  const stepNames = [
    'Dates & Location',
    'Customer Info',
    'Extras',
    'Review',
    'Confirmation',
  ]
  const currentStepName = computed(() => stepNames[step.value - 1] ?? '')

  function nextStep(skipCustomerStep = false) {
    if (step.value === 1 && skipCustomerStep) {
      step.value = 3
    } else if (step.value < 5) {
      step.value++
    }
  }

  function prevStep(skipCustomerStep = false) {
    if (step.value === 3 && skipCustomerStep) {
      step.value = 1
    } else if (step.value > 1) {
      step.value--
    }
  }

  function goToStep(targetStep: number, skipCustomerStep = false) {
    if (targetStep >= 1 && targetStep <= 5) {
      if (targetStep === 2 && skipCustomerStep) {
        step.value = 3
      } else {
        step.value = targetStep
      }
    }
  }

  function resetStep() {
    step.value = 1
  }

  return {
    step,
    isFirstStep,
    isLastStep,
    currentStepName,
    nextStep,
    prevStep,
    goToStep,
    resetStep,
  }
}
