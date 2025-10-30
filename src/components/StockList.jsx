import { useState } from 'react'
import StockCard from './StockCard'
import { isWatched } from '../utils/storage'

function StockList({ stocks, query, actionFilter, page, pageSize, onUpdate }) {
  const [, setRefresh] = useState(0)

  const handleCardUpdate = () => {
    setRefresh((r) => r + 1)
    if (onUpdate) onUpdate()
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="empty-state">
        <p>📭 目前沒有追蹤的股票</p>
      </div>
    )
  }

  // 過濾條件
  const q = (query || '').trim().toLowerCase()
  const hasQuery = !!q || (actionFilter && actionFilter !== 'all')
  
  const byQuery = (s) => {
    if (!q) return true
    return (
      (s.symbol && String(s.symbol).toLowerCase().includes(q)) ||
      (s.name && String(s.name).toLowerCase().includes(q))
    )
  }

  const byAction = (s) => {
    if (!actionFilter || actionFilter === 'all') return true
    return s.recommendation?.action === actionFilter
  }

  // 排序：關注優先 > 建議類型（買>持>賣）> 漲跌幅 > 成交量
  const actionOrder = { buy: 1, hold: 2, sell: 3 }
  const allFiltered = stocks.filter((s) => byQuery(s) && byAction(s))
  const allSorted = allFiltered.sort((a, b) => {
    // 優先：關注股票在前
    const aWatched = isWatched(a.symbol) ? 0 : 1
    const bWatched = isWatched(b.symbol) ? 0 : 1
    if (aWatched !== bWatched) return aWatched - bWatched

    const ao = actionOrder[a.recommendation?.action] || 9
    const bo = actionOrder[b.recommendation?.action] || 9
    if (ao !== bo) return ao - bo
    const bp = (b.changePercent ?? 0) - (a.changePercent ?? 0)
    if (bp !== 0) return bp
    return (b.volume ?? 0) - (a.volume ?? 0)
  })

  // 智能顯示邏輯：無搜尋時僅顯示釘選股票 + 前5個建議買入
  let sorted = allSorted
  let displayMode = 'all' // 'all' or 'smart'
  
  if (!hasQuery) {
    // 無搜尋/篩選：顯示釘選股票 + 前5個建議買入的股票
    displayMode = 'smart'
    const watchedStocks = allSorted.filter(s => isWatched(s.symbol))
    const buyRecommendations = allSorted
      .filter(s => !isWatched(s.symbol) && s.recommendation?.action === 'buy')
      .slice(0, 5)
    sorted = [...watchedStocks, ...buyRecommendations]
  }

  // 分頁
  const total = sorted.length
  const totalAll = stocks.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = sorted.slice(start, end)

  return (
    <>
      <div className="stock-list">
        {pageItems.map((stock) => (
          <StockCard key={stock.symbol} stock={stock} onUpdate={handleCardUpdate} />
        ))}
      </div>
      <div className="list-meta">
        {displayMode === 'smart' 
          ? `顯示釘選股票 + 前5個建議買入（${total} 筆）| 總股票數：${totalAll}，使用搜尋查看更多`
          : `顯示 ${start + 1}-${Math.min(end, total)} / ${total}`
        }
      </div>
    </>
  )
}

export default StockList
