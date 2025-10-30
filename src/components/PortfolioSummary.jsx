import { formatNumber, formatPercent } from '../utils/formatter'

function PortfolioSummary({ stocks, holdings }) {
  if (!stocks || stocks.length === 0) return null

  // 計算總持有成本與市值
  let totalCost = 0
  let totalValue = 0
  let hasHoldings = false

  stocks.forEach((stock) => {
    const holding = holdings[stock.symbol]
    if (holding && holding.shares > 0 && holding.cost > 0) {
      hasHoldings = true
      const cost = holding.shares * holding.cost
      const value = holding.shares * stock.price
      totalCost += cost
      totalValue += value
    }
  })

  if (!hasHoldings) {
    return (
      <section className="portfolio-summary empty">
        <p>💡 尚未記錄持有股票，請點擊股票卡片輸入持有成本與股數</p>
      </section>
    )
  }

  const profit = totalValue - totalCost
  const returnPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0
  const profitColor = profit > 0 ? 'text-red' : profit < 0 ? 'text-green' : 'text-gray'

  return (
    <section className="portfolio-summary">
      <h2>📊 投資總覽</h2>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">總持有成本</span>
          <span className="summary-value">${formatNumber(totalCost)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">當前市值</span>
          <span className="summary-value">${formatNumber(totalValue)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">報酬金額</span>
          <span className={`summary-value ${profitColor}`}>
            {profit > 0 ? '+' : ''}{formatNumber(profit)}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">報酬率</span>
          <span className={`summary-value ${profitColor}`}>
            {profit > 0 ? '+' : ''}{formatPercent(returnPercent)}
          </span>
        </div>
      </div>
    </section>
  )
}

export default PortfolioSummary
