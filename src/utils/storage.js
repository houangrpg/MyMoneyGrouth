// 本地儲存工具：管理關注股票、持有成本
const STORAGE_KEYS = {
  WATCHLIST: 'myMoneyGrowth_watchlist', // 關注的股票代碼陣列
  HOLDINGS: 'myMoneyGrowth_holdings',   // { symbol: { shares, cost } }
}

// 獲取關注清單
export function getWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// 設定關注清單
export function setWatchlist(symbols) {
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(symbols))
}

// 切換關注狀態
export function toggleWatchlist(symbol) {
  const list = getWatchlist()
  const index = list.indexOf(symbol)
  if (index > -1) {
    list.splice(index, 1)
  } else {
    list.push(symbol)
  }
  setWatchlist(list)
  return list
}

// 檢查是否已關注
export function isWatched(symbol) {
  return getWatchlist().includes(symbol)
}

// 獲取持有資訊
export function getHoldings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOLDINGS)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// 設定持有資訊
export function setHoldings(holdings) {
  localStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings))
}

// 更新單一股票的持有資訊
export function updateHolding(symbol, shares, cost) {
  const holdings = getHoldings()
  if (shares > 0 && cost > 0) {
    holdings[symbol] = { shares: parseFloat(shares), cost: parseFloat(cost) }
  } else {
    delete holdings[symbol]
  }
  setHoldings(holdings)
  return holdings
}

// 獲取單一股票持有資訊
export function getHolding(symbol) {
  const holdings = getHoldings()
  return holdings[symbol] || null
}
