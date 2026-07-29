export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function normalizePhoneNumber(value) {
  const digits = onlyDigits(value)

  if (!digits) {
    throw new Error('Phone number is required.')
  }

  let normalized = digits

  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    normalized = `55${digits}`
  }

  if (normalized.length < 11 || normalized.length > 15) {
    throw new Error('Invalid phone number. Use country code, for example 5571999999999.')
  }

  return normalized
}

export function toBaileysJid(value) {
  const rawValue = String(value ?? '').trim()

  if (rawValue.includes('@')) {
    return rawValue
  }

  return `${normalizePhoneNumber(rawValue)}@s.whatsapp.net`
}

export function phoneFromJid(jid) {
  const localPart = String(jid ?? '').split('@')[0] ?? ''
  return onlyDigits(localPart.split(':')[0])
}

export function phonesLookEqual(left, right) {
  const leftDigits = onlyDigits(left)
  const rightDigits = onlyDigits(right)

  if (!leftDigits || !rightDigits) return false

  return leftDigits === rightDigits
    || leftDigits.endsWith(rightDigits)
    || rightDigits.endsWith(leftDigits)
}

export function isLikelyLid(value) {
  const digits = onlyDigits(value)
  return digits.length >= 12 && digits.length <= 15 && !digits.startsWith('55')
}

export function toLikelyLidJid(value) {
  const digits = onlyDigits(value)

  if (!digits) {
    throw new Error('LID value is required.')
  }

  return `${digits}@lid`
}
