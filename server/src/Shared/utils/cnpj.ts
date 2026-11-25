export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isValidCnpj(raw: string): boolean {
  const cnpj = normalizeCnpj(raw)

  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false
  }

  const calcDigit = (base: string, weights: readonly number[]): number => {
    let sum = 0
    for (let i = 0; i < weights.length; i += 1) {
      sum += Number(base[i]) * weights[i]
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const

  const digit1 = calcDigit(cnpj.slice(0, 12), firstWeights)
  if (digit1 !== Number(cnpj[12])) {
    return false
  }

  const digit2 = calcDigit(cnpj.slice(0, 13), secondWeights)
  return digit2 === Number(cnpj[13])
}
