import { useState, useEffect } from 'react'
import StockCard from './StockCard'
import StockDetailModal from './StockDetailModal'
import { isWatched } from '../utils/storage'
import { fetchLiveStock } from '../utils/liveStock'

function StockList({ stocks, query, actionFilter, viewMode = 'watchlist', page, pageSize, onUpdate }) {
  const [, setRefresh] = useState(0)
  const [liveStocks, setLiveStocks] = useState([]) // 即時查詢的股票
  const [loadingLive, setLoadingLive] = useState(false)
  const [liveError, setLiveError] = useState(null)
  const [selectedStock, setSelectedStock] = useState(null)

  const handleCardUpdate = () => {
    setRefresh((r) => r + 1)
    if (onUpdate) onUpdate()
  }

  // 頁面載入時自動更新關注股票的即時資料
  useEffect(() => {
    const refreshWatchedStocks = async () => {
      if (!stocks || stocks.length === 0) return
      
      // 取得所有關注的股票
      const watchedSymbols = stocks.filter(s => isWatched(s.symbol)).map(s => s.symbol)
      if (watchedSymbols.length === 0) return

      console.log('🔄 自動更新關注股票:', watchedSymbols)
      
      // 逐個更新關注股票（避免同時發送太多請求）
      for (const symbol of watchedSymbols) {
        try {
          const liveStock = await fetchLiveStock(symbol)
          // 更新到原始 stocks 陣列中（這會觸發父元件重新渲染）
          const index = stocks.findIndex(s => s.symbol === symbol)
          if (index !== -1 && liveStock) {
            stocks[index] = { ...stocks[index], ...liveStock }
          }
        } catch (error) {
          console.warn(`更新 ${symbol} 失敗:`, error.message)
        }
        // 每次請求間隔 500ms 避免被限流
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      setRefresh((r) => r + 1) // 觸發重新渲染
    }

    // 只在首次載入和重整頁面時執行
    refreshWatchedStocks()
  }, []) // 空依賴陣列，只執行一次

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

  const byViewMode = (s) => {
    if (viewMode === 'all') return true
    if (viewMode === 'watchlist') return isWatched(s.symbol)
    return true
  }

  // 排序：關注優先 > 建議類型（買>持>賣）> 漲跌幅 > 成交量
  const actionOrder = { buy: 1, hold: 2, sell: 3 }
  const allFiltered = stocks.filter((s) => byQuery(s) && byAction(s) && byViewMode(s))
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

  // 智能顯示邏輯：無搜尋時僅顯示釘選股票 + 前5個建議買入（不含釘選）
  let sorted = allSorted
  let displayMode = 'all' // 'all' or 'smart'
  
  if (!hasQuery) {
    // 無搜尋/篩選：顯示釘選股票 + 前5個建議買入的股票（不含已釘選的）
    displayMode = 'smart'
    const watchedStocks = allSorted.filter(s => isWatched(s.symbol))
    // 只取未釘選且建議買入的股票，取前5個
    const buyRecommendations = allSorted
      .filter(s => !isWatched(s.symbol) && s.recommendation?.action === 'buy')
      .slice(0, 5)
    sorted = [...watchedStocks, ...buyRecommendations]
  }

  // 即時查詢股票
  const handleLiveSearch = async () => {
    if (!q) return
    
    setLoadingLive(true)
    setLiveError(null)
    
    try {
      // 嘗試查詢股票代碼
      const stock = await fetchLiveStock(q)
      setLiveStocks([stock])
    } catch (error) {
      setLiveError(error.message || '查詢失敗，請確認股票代碼是否正確')
      setLiveStocks([])
    } finally {
      setLoadingLive(false)
    }
  }

  // 當搜尋條件改變時，清除即時查詢結果
  useEffect(() => {
    setLiveStocks([])
    setLiveError(null)
  }, [q, actionFilter])

  // 合併追蹤清單和即時查詢的股票
  const allStocks = [...sorted, ...liveStocks]
  
  // 分頁
  const total = allStocks.length
  const totalAll = stocks.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = allStocks.slice(start, end)

  // 檢查是否有搜尋但沒有結果
  const hasQueryButNoResults = hasQuery && sorted.length === 0 && liveStocks.length === 0

  return (
    <>
      {hasQueryButNoResults && (
        <div className="live-search-prompt">
          <p>📭 在追蹤清單中找不到「{query}」</p>
          <button 
            className="btn-live-search" 
            onClick={handleLiveSearch}
            disabled={loadingLive}
          >
            {loadingLive ? '⏳ 查詢中...' : '🔍 即時查詢此股票'}
          </button>
          {liveError && <p className="error-text">❌ {liveError}</p>}
        </div>
      )}
      
      <div className="stock-list">
        {pageItems.map((stock) => (
          <StockCard 
            key={stock.symbol} 
            stock={stock} 
            onUpdate={handleCardUpdate}
            onShowDetail={setSelectedStock}
            isLive={stock.isLive}
          />
        ))}
      </div>
      
      {allStocks.length > 0 && (
        <div className="list-meta">
          {displayMode === 'smart' 
            ? `顯示釘選股票 + 前5個建議買入（${total} 筆）| 總股票數：${totalAll}，使用搜尋查看更多`
            : `顯示 ${start + 1}-${Math.min(end, total)} / ${total}${liveStocks.length > 0 ? ' (含即時查詢)' : ''}`
          }
        </div>
      )}

      {selectedStock && (
        <StockDetailModal 
          stock={selectedStock} 
          onClose={() => setSelectedStock(null)} 
        />
      )}
    </>
  )
}

export default StockList
