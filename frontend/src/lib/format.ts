const twoDecimals = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export const formatNumber2 = (n: number) => twoDecimals.format(n)

export const formatInteger = (n: number) => integer.format(n)

const oneDecimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${oneDecimal.format(bytes / 1024)} KB` : `${oneDecimal.format(bytes / 1024 / 1024)} MB`
