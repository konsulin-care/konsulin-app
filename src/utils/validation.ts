export function validateEmail(value: string) {
  return /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/.test(
    value
  )
}

export function alphaNumeric(value: string) {
  return /^[a-zA-Z0-9]+$/.test(value)
}

export function upperCaseOneCharacter(value: string) {
  return /[A-Z]/.test(value)
}

export function specialCharacter(value: string) {
  return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
}

export function capitalizeFirstLetter(str) {
  return str.replace(/^\w/, (c: string) => c.toUpperCase())
}

export function formatLabel(label: string) {
  return label
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char: string) => char.toUpperCase()) // Capitalize the first letter of each word
}

export function convertCurrencyStringToNumber(currencyString: string) {
  const numberString = currencyString.replace(/[^0-9]/g, '')
  return parseInt(numberString, 10)
}

export function formatCurrency(value) {
  if (!value || typeof value !== 'string') {
    return ''
  }

  const numberValue = parseInt(value.replace(/[^0-9]/g, ''), 10)

  if (isNaN(numberValue)) {
    return ''
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(numberValue)
}
