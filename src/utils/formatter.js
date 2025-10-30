/**
 * 格式化數字（千分位逗號）
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '—'
  return num.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/**
 * 格式化百分比
 */
export function formatPercent(num) {
  if (num === null || num === undefined) return '—'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

/**
 * 格式化日期時間
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—'
  
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hour}:${minute} 更新`
}
