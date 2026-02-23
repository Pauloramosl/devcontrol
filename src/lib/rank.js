const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE = ALPHABET.length
const MIN_CHAR = ALPHABET[0]
const MAX_CHAR = ALPHABET[BASE - 1]
const MID_CHAR = ALPHABET[Math.floor(BASE / 2)]
const MAX_ITERATIONS = 64

function indexOfChar(char) {
  const index = ALPHABET.indexOf(char)
  if (index === -1) {
    throw new Error(`Invalid rank character: "${char}"`)
  }

  return index
}

function compareRanks(a, b) {
  if (a === b) return 0
  if (a == null) return -1
  if (b == null) return 1

  const maxLength = Math.max(a.length, b.length)
  for (let i = 0; i < maxLength; i += 1) {
    const left = i < a.length ? indexOfChar(a[i]) : -1
    const right = i < b.length ? indexOfChar(b[i]) : -1
    if (left < right) return -1
    if (left > right) return 1
  }

  return 0
}

function tryRankBetween(a, b) {
  let prefix = ''

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const left = i < a.length ? indexOfChar(a[i]) : 0
    const right = i < b.length ? indexOfChar(b[i]) : BASE - 1

    if (left === right) {
      prefix += ALPHABET[left]
      continue
    }

    if (right - left > 1) {
      const middle = Math.floor((left + right) / 2)
      const candidate = `${prefix}${ALPHABET[middle]}`
      if (compareRanks(a, candidate) < 0 && compareRanks(candidate, b) < 0) {
        return candidate
      }
    }

    prefix += ALPHABET[left]
  }

  return null
}

export function rankAfter(a) {
  if (!a) {
    return MID_CHAR
  }

  for (let i = a.length - 1; i >= 0; i -= 1) {
    const current = indexOfChar(a[i])
    if (current < BASE - 1) {
      return `${a.slice(0, i)}${ALPHABET[current + 1]}`
    }
  }

  return `${a}${MID_CHAR}`
}

export function rankBefore(b) {
  if (!b) {
    return MID_CHAR
  }

  for (let i = b.length - 1; i >= 0; i -= 1) {
    const current = indexOfChar(b[i])
    if (current > 0) {
      return `${b.slice(0, i)}${ALPHABET[current - 1]}${MAX_CHAR}`
    }
  }

  return null
}

export function rankBetween(a, b) {
  if (!a && !b) {
    return MID_CHAR
  }

  if (!a) {
    return rankBefore(b)
  }

  if (!b) {
    return rankAfter(a)
  }

  if (compareRanks(a, b) >= 0) {
    return null
  }

  return tryRankBetween(a, b)
}

export function generateSequentialRanks(count) {
  if (count <= 0) return []

  const ranks = []
  let current = MID_CHAR
  for (let i = 0; i < count; i += 1) {
    if (i === 0) {
      ranks.push(current)
      continue
    }

    current = rankAfter(current)
    ranks.push(current)
  }

  return ranks
}

export { MIN_CHAR, MAX_CHAR, MID_CHAR }
