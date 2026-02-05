export function useFormatPrice() {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  return {
    formatPrice,
  }
}
