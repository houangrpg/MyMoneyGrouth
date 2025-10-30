import StockCard from './StockCard'

function StockList({ stocks, query, actionFilter, page, pageSize }) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="empty-state">
        <p>📭 目前沒有追蹤的股票</p>
      </div>
    )
  }

  // 過濾條件
  const q = (query || '').trim().toLowerCase()
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

  // 排序：先依建議類型（買>持>賣），再依漲跌幅（由高到低）
  const actionOrder = { buy: 1, hold: 2, sell: 3 }
  const filtered = stocks.filter((s) => byQuery(s) && byAction(s))
  const sorted = filtered.sort((a, b) => {
    const ao = actionOrder[a.recommendation?.action] || 9
    const bo = actionOrder[b.recommendation?.action] || 9
    if (ao !== bo) return ao - bo
    const bp = (b.changePercent ?? 0) - (a.changePercent ?? 0)
    if (bp !== 0) return bp
    return (b.volume ?? 0) - (a.volume ?? 0)
  })

  // 分頁
  const total = sorted.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = sorted.slice(start, end)

  return (
    <>
      <div className="stock-list">
        {pageItems.map((stock) => (
          <StockCard key={stock.symbol} stock={stock} />
        ))}
      </div>
      <div className="list-meta">顯示 {start + 1}-{Math.min(end, total)} / {total}</div>
    </>
  )
}

export default StockList
