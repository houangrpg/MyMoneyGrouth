import { formatNumber, formatPercent } from '../utils/formatter'

function StockCard({ stock }) {
  const { symbol, name, price, change, changePercent, volume, recommendation } = stock
  const { action, reason, confidence } = recommendation

  // 根據漲跌決定顏色
  const priceColor = change > 0 ? 'text-red' : change < 0 ? 'text-green' : 'text-gray'
  
  // 建議標籤樣式與圖示
  const actionConfig = {
    buy: { label: '🟢 買入', className: 'badge-buy' },
    hold: { label: '🟡 持有', className: 'badge-hold' },
    sell: { label: '🔴 賣出', className: 'badge-sell' }
  }

  const actionInfo = actionConfig[action] || { label: action, className: '' }

  return (
    <article className="stock-card">
      <div className="stock-header">
        <div className="stock-title">
          <h2>{symbol}</h2>
          <h3>{name}</h3>
        </div>
        <span className={`badge ${actionInfo.className}`}>
          {actionInfo.label}
        </span>
      </div>

      <div className="stock-price">
        <div className="price-main">
          <span className="price-value">${formatNumber(price)}</span>
          <span className={`price-change ${priceColor}`}>
            {change > 0 ? '▲' : change < 0 ? '▼' : '－'} 
            {formatNumber(Math.abs(change))} ({formatPercent(changePercent)})
          </span>
        </div>
        <div className="price-meta">
          <span>成交量：{formatNumber(volume)}</span>
        </div>
      </div>

      <div className="recommendation">
        <div className="recommendation-header">
          <span className="recommendation-label">建議理由</span>
          <span className="confidence">
            信心度：{Math.round(confidence * 100)}%
          </span>
        </div>
        <p className="recommendation-reason">{reason}</p>
      </div>
    </article>
  )
}

export default StockCard
