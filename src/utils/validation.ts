export function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
