import { useState } from 'react'
import { formatNumber, formatPercent } from '../utils/formatter'
import { isWatched, toggleWatchlist, getHolding, updateHolding } from '../utils/storage'

function StockCard({ stock, onUpdate }) {
  const { symbol, name, price, change, changePercent, volume, recommendation } = stock
  const { action, reason, confidence } = recommendation

  const [watched, setWatched] = useState(isWatched(symbol))
  const [showHoldingForm, setShowHoldingForm] = useState(false)
  const holding = getHolding(symbol)

  const [shares, setShares] = useState(holding?.shares || '')
  const [cost, setCost] = useState(holding?.cost || '')

  const handleToggleWatch = () => {
    toggleWatchlist(symbol)
    setWatched(!watched)
    if (onUpdate) onUpdate()
  }

  const handleSaveHolding = () => {
    updateHolding(symbol, shares, cost)
    setShowHoldingForm(false)
    if (onUpdate) onUpdate()
  }

  const handleClearHolding = () => {
    updateHolding(symbol, 0, 0)
    setShares('')
    setCost('')
    setShowHoldingForm(false)
    if (onUpdate) onUpdate()
  }

  // 計算持有損益（若有）
  let holdingProfit = null
  let holdingProfitPercent = null
  if (holding && holding.shares > 0 && holding.cost > 0) {
    const costTotal = holding.shares * holding.cost
    const valueTotal = holding.shares * price
    holdingProfit = valueTotal - costTotal
    holdingProfitPercent = (holdingProfit / costTotal) * 100
  }

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
    <article className={`stock-card ${watched ? 'watched' : ''}`}>
      <div className="stock-header">
        <div className="stock-title">
          <h2>{symbol}</h2>
          <h3>{name}</h3>
        </div>
        <div className="stock-actions">
          <button
            className={`watch-btn ${watched ? 'active' : ''}`}
            onClick={handleToggleWatch}
            title={watched ? '取消關注' : '加入關注'}
          >
            {watched ? '📌' : '📍'}
          </button>
          <span className={`badge ${actionInfo.className}`}>
            {actionInfo.label}
          </span>
        </div>
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
        {holdingProfit !== null && (
          <div className="holding-profit">
            持有損益：
            <span className={holdingProfit > 0 ? 'text-red' : holdingProfit < 0 ? 'text-green' : 'text-gray'}>
              {holdingProfit > 0 ? '+' : ''}{formatNumber(holdingProfit)} ({holdingProfit > 0 ? '+' : ''}{formatPercent(holdingProfitPercent)})
            </span>
          </div>
        )}
      </div>

      <div className="holding-section">
        {!showHoldingForm && (
          <button className="holding-toggle-btn" onClick={() => setShowHoldingForm(true)}>
            {holding ? '📝 編輯持有' : '➕ 記錄持有'}
          </button>
        )}
        {showHoldingForm && (
          <div className="holding-form">
            <div className="form-row">
              <label>
                持有股數
                <input
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="股數"
                  min="0"
                  step="1"
                />
              </label>
              <label>
                成本價格
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="成本"
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
            <div className="form-actions">
              <button onClick={handleSaveHolding} className="btn-save">
                💾 儲存
              </button>
              {holding && (
                <button onClick={handleClearHolding} className="btn-clear">
                  🗑️ 清除
                </button>
              )}
              <button onClick={() => setShowHoldingForm(false)} className="btn-cancel">
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export default StockCard
