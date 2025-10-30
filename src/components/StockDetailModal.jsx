import { useState, useEffect } from 'react'
import { formatNumber, formatPercent } from '../utils/formatter'

function StockDetailModal({ stock, onClose }) {
  const [activeTab, setActiveTab] = useState('analysis') // analysis | backtest | news
  const [chartData, setChartData] = useState(null)
  const [backtestResult, setBacktestResult] = useState(null)
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stock) {
      loadStockDetails()
    }
  }, [stock])

  const loadStockDetails = async () => {
    setLoading(true)
    try {
      // 載入歷史資料與回測結果
      await Promise.all([
        loadChartData(),
        loadBacktestData(),
        loadNews()
      ])
    } catch (error) {
      console.error('載入詳細資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    try {
      // 使用 Yahoo Finance Chart API 取得歷史資料
      const symbol = stock.symbol
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=3mo`)
      if (!response.ok) throw new Error('無法載入圖表資料')
      
      const data = await response.json()
      const result = data.chart?.result?.[0]
      if (result) {
        const timestamps = result.timestamp || []
        const quotes = result.indicators?.quote?.[0] || {}
        
        setChartData({
          dates: timestamps.map(t => new Date(t * 1000).toLocaleDateString('zh-TW')),
          closes: quotes.close || [],
          volumes: quotes.volume || [],
          highs: quotes.high || [],
          lows: quotes.low || []
        })
      }
    } catch (error) {
      console.error('載入圖表失敗:', error)
    }
  }

  const loadBacktestData = async () => {
    try {
      // 簡易回測：模擬過去 3 個月依照策略買賣的績效
      const symbol = stock.symbol
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=3mo`)
      if (!response.ok) throw new Error('無法載入回測資料')
      
      const data = await response.json()
      const result = data.chart?.result?.[0]
      if (!result) throw new Error('無效資料')
      
      const quotes = result.indicators?.quote?.[0] || {}
      const closes = (quotes.close || []).filter(c => c != null)
      
      if (closes.length < 30) {
        setBacktestResult({ error: '資料不足，無法進行回測' })
        return
      }

      // 簡化回測邏輯：依照 SMA 交叉訊號買賣
      let capital = 100000 // 初始資金 10 萬
      let shares = 0
      let trades = []
      
      for (let i = 20; i < closes.length; i++) {
        const sma5 = closes.slice(i-5, i).reduce((a,b) => a+b, 0) / 5
        const sma20 = closes.slice(i-20, i).reduce((a,b) => a+b, 0) / 20
        const prevSma5 = i > 20 ? closes.slice(i-6, i-1).reduce((a,b) => a+b, 0) / 5 : sma5
        const prevSma20 = i > 20 ? closes.slice(i-21, i-1).reduce((a,b) => a+b, 0) / 20 : sma20
        
        // 黃金交叉：買入
        if (prevSma5 <= prevSma20 && sma5 > sma20 && shares === 0 && capital > 0) {
          shares = Math.floor(capital / closes[i])
          const cost = shares * closes[i]
          capital -= cost
          trades.push({
            date: i,
            action: 'buy',
            price: closes[i],
            shares,
            value: cost
          })
        }
        
        // 死亡交叉：賣出
        if (prevSma5 >= prevSma20 && sma5 < sma20 && shares > 0) {
          const value = shares * closes[i]
          capital += value
          trades.push({
            date: i,
            action: 'sell',
            price: closes[i],
            shares,
            value
          })
          shares = 0
        }
      }
      
      // 最終結算
      const finalValue = capital + (shares * closes[closes.length - 1])
      const profit = finalValue - 100000
      const profitPercent = (profit / 100000) * 100
      const winTrades = trades.filter((t, i) => {
        if (t.action === 'sell' && i > 0) {
          return t.value > trades[i-1].value
        }
        return false
      }).length
      const totalSellTrades = trades.filter(t => t.action === 'sell').length
      const winRate = totalSellTrades > 0 ? (winTrades / totalSellTrades) * 100 : 0
      
      setBacktestResult({
        initialCapital: 100000,
        finalValue,
        profit,
        profitPercent,
        trades: trades.length,
        winRate,
        tradeDetails: trades.slice(-10) // 最近 10 筆交易
      })
    } catch (error) {
      console.error('回測計算失敗:', error)
      setBacktestResult({ error: '回測失敗' })
    }
  }

  const loadNews = async () => {
    try {
      // 使用 Google News RSS 或 Yahoo Finance News
      // 注意：這需要後端 API 支援（避免 CORS）
      const symbol = stock.symbol.replace('.TW', '').replace('.TWO', '')
      const searchQuery = encodeURIComponent(`${symbol} ${stock.name} 股票`)
      
      // 暫時使用模擬資料（實際部署時需串接真實 API）
      const mockNews = [
        {
          title: `${stock.name}(${symbol}) 法說會釋出樂觀展望`,
          source: '經濟日報',
          date: '2025-10-29',
          url: `https://www.google.com/search?q=${searchQuery}&tbm=nws`
        },
        {
          title: `外資連三日買超 ${stock.name}`,
          source: '工商時報',
          date: '2025-10-28',
          url: `https://www.google.com/search?q=${searchQuery}&tbm=nws`
        },
        {
          title: `${stock.name} Q3財報優於預期`,
          source: '鉅亨網',
          date: '2025-10-27',
          url: `https://www.google.com/search?q=${searchQuery}&tbm=nws`
        }
      ]
      
      setNews(mockNews)
    } catch (error) {
      console.error('載入新聞失敗:', error)
    }
  }

  if (!stock) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stock-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{stock.symbol} - {stock.name}</h2>
            <div className="stock-price-inline">
              <span className="price-lg">${formatNumber(stock.price)}</span>
              <span className={`change-lg ${stock.change > 0 ? 'text-red' : 'text-green'}`}>
                {stock.change > 0 ? '▲' : '▼'} {formatNumber(Math.abs(stock.change))} ({formatPercent(stock.changePercent)})
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 技術分析
          </button>
          <button 
            className={`tab ${activeTab === 'backtest' ? 'active' : ''}`}
            onClick={() => setActiveTab('backtest')}
          >
            🔄 歷史回測
          </button>
          <button 
            className={`tab ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            📰 相關新聞
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-inline">
              <div className="spinner-sm"></div>
              <span>載入中...</span>
            </div>
          )}

          {!loading && activeTab === 'analysis' && (
            <div className="analysis-tab">
              <div className="recommendation-detail">
                <h3>投資建議</h3>
                <div className={`badge-lg badge-${stock.recommendation.action}`}>
                  {stock.recommendation.action === 'buy' ? '🟢 買入' : 
                   stock.recommendation.action === 'sell' ? '🔴 賣出' : '🟡 持有'}
                </div>
                <p className="reason-lg">{stock.recommendation.reason}</p>
                <div className="confidence-bar">
                  <label>信心度：{Math.round(stock.recommendation.confidence * 100)}%</label>
                  <div className="bar">
                    <div 
                      className="fill" 
                      style={{ width: `${stock.recommendation.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {chartData && (
                <div className="chart-section">
                  <h3>近三個月走勢</h3>
                  <div className="simple-chart">
                    {/* 簡易文字圖表（實際可用 Chart.js 或 Recharts） */}
                    <div className="chart-stats">
                      <div>最高：${formatNumber(Math.max(...chartData.highs.filter(h => h)))}</div>
                      <div>最低：${formatNumber(Math.min(...chartData.lows.filter(l => l)))}</div>
                      <div>均量：{formatNumber(chartData.volumes.reduce((a,b) => a+(b||0), 0) / chartData.volumes.length)}</div>
                    </div>
                    <p className="chart-placeholder">
                      📈 圖表功能開發中（可整合 TradingView Widget 或 Chart.js）
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'backtest' && backtestResult && (
            <div className="backtest-tab">
              {backtestResult.error ? (
                <div className="error-msg">{backtestResult.error}</div>
              ) : (
                <>
                  <h3>回測績效（近 3 個月）</h3>
                  <div className="backtest-summary">
                    <div className="stat-card">
                      <label>初始資金</label>
                      <div className="value">${formatNumber(backtestResult.initialCapital)}</div>
                    </div>
                    <div className="stat-card">
                      <label>最終市值</label>
                      <div className="value">${formatNumber(backtestResult.finalValue)}</div>
                    </div>
                    <div className="stat-card">
                      <label>累計損益</label>
                      <div className={`value ${backtestResult.profit > 0 ? 'text-red' : 'text-green'}`}>
                        {backtestResult.profit > 0 ? '+' : ''}{formatNumber(backtestResult.profit)}
                        <small>({formatPercent(backtestResult.profitPercent)})</small>
                      </div>
                    </div>
                    <div className="stat-card">
                      <label>交易次數</label>
                      <div className="value">{backtestResult.trades}</div>
                    </div>
                    <div className="stat-card">
                      <label>勝率</label>
                      <div className="value">{formatPercent(backtestResult.winRate)}</div>
                    </div>
                  </div>

                  {backtestResult.tradeDetails && backtestResult.tradeDetails.length > 0 && (
                    <div className="trade-history">
                      <h4>最近交易記錄</h4>
                      <table>
                        <thead>
                          <tr>
                            <th>動作</th>
                            <th>價格</th>
                            <th>股數</th>
                            <th>金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtestResult.tradeDetails.map((trade, idx) => (
                            <tr key={idx}>
                              <td className={trade.action === 'buy' ? 'text-red' : 'text-green'}>
                                {trade.action === 'buy' ? '買入' : '賣出'}
                              </td>
                              <td>${formatNumber(trade.price)}</td>
                              <td>{formatNumber(trade.shares)}</td>
                              <td>${formatNumber(trade.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="backtest-note">
                    ⚠️ 回測結果僅供參考，過去績效不代表未來表現
                  </div>
                </>
              )}
            </div>
          )}

          {!loading && activeTab === 'news' && (
            <div className="news-tab">
              <h3>近一週財經新聞</h3>
              {news.length === 0 ? (
                <p className="no-news">目前無相關新聞</p>
              ) : (
                <div className="news-list">
                  {news.map((item, idx) => (
                    <article key={idx} className="news-item">
                      <h4>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {item.title} 🔗
                        </a>
                      </h4>
                      <div className="news-meta">
                        <span className="source">{item.source}</span>
                        <span className="date">{item.date}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StockDetailModal
