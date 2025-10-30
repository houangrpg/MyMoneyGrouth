import StockCard from './StockCard'

function StockList({ stocks }) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="empty-state">
        <p>📭 目前沒有追蹤的股票</p>
      </div>
    )
  }

  // 依建議類型排序：買入 > 持有 > 賣出
  const actionOrder = { buy: 1, hold: 2, sell: 3 }
  const sortedStocks = [...stocks].sort((a, b) => {
    return actionOrder[a.recommendation.action] - actionOrder[b.recommendation.action]
  })

  return (
    <div className="stock-list">
      {sortedStocks.map((stock) => (
        <StockCard key={stock.symbol} stock={stock} />
      ))}
    </div>
  )
}

export default StockList
