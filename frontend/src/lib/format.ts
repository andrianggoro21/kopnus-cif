const twoDecimals = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export const formatNumber2 = (n: number) => twoDecimals.format(n)

export const formatInteger = (n: number) => integer.format(n)
