import type { Customer } from '~/types'
import { useCustomerStore } from '~/stores/customerStore'

export interface CustomerFormState {
  name: string
  surname: string
  email: string
  phone: string
  address: { street: string; city: string }
  PersonalNr: string
  licenseClasses: string[]
  frontIdFile: File | null
  backIdFile: File | null
  passportFile: File | null
  patentShoferFile: File | null
}

function getDefaultCustomerForm(): CustomerFormState {
  return {
    name: '',
    surname: '',
    email: '',
    phone: '',
    address: { street: '', city: '' },
    PersonalNr: '',
    licenseClasses: [],
    frontIdFile: null,
    backIdFile: null,
    passportFile: null,
    patentShoferFile: null,
  }
}

export function useCheckoutCustomer() {
  const customerStore = useCustomerStore()
  const toast = useToast()

  const customerForm = useState<CustomerFormState>(
    'checkout-customer-form',
    getDefaultCustomerForm,
  )
  const selectedDocument = useState<'id' | 'passport'>(
    'checkout-selected-document',
    () => 'id',
  )
  const isCustomerExist = useState<boolean>('checkout-customer-exists', () => false)

  async function checkCustomerByEmail(
    tenantId: number,
    email: string,
  ): Promise<boolean> {
    try {
      const customer = await customerStore.fetchByEmail(tenantId, email)
      if (customer) {
        populateFromCustomer(customer)
        isCustomerExist.value = true
        return true
      }
      isCustomerExist.value = false
      return false
    } catch {
      toast.add({
        title: 'Error',
        description: 'Failed to check customer',
        color: 'error',
      })
      isCustomerExist.value = false
      return false
    }
  }

  function populateFromCustomer(customer: Customer) {
    customerForm.value.name = customer.name
    customerForm.value.surname = customer.surname
    customerForm.value.phone = customer.phone
    customerForm.value.address.street = customer.address.street
    customerForm.value.address.city = customer.address.city
    if (customer.PersonalNr) customerForm.value.PersonalNr = customer.PersonalNr
    if (customer.licenseClasses)
      customerForm.value.licenseClasses = customer.licenseClasses
  }

  function setCustomerField<K extends keyof CustomerFormState>(
    field: K,
    value: CustomerFormState[K],
  ) {
    customerForm.value[field] = value
  }

  function resetCustomerForm() {
    customerForm.value = getDefaultCustomerForm()
    selectedDocument.value = 'id'
    isCustomerExist.value = false
  }

  return {
    customerForm,
    selectedDocument,
    isCustomerExist,
    checkCustomerByEmail,
    populateFromCustomer,
    setCustomerField,
    resetCustomerForm,
  }
}
