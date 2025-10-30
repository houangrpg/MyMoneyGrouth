// 懶載入並快取 names.json（symbol -> 中文名稱）
let __namesMap = null
let __namesMapPromise = null

async function loadNamesMap() {
  if (__namesMap) return __namesMap
  if (!__namesMapPromise) {
    const tryPrimary = async () => {
      const res = await fetch('/names.json')
      if (!res.ok) throw new Error('primary names.json not found')
      return res.json()
    }
    const tryFallback = async () => {
      // 退回抓 GitHub raw（常見為可跨網域）
      const RAW = 'https://raw.githubusercontent.com/houangrpg/MyMoneyGrouth/main/public/names.json'
      const res = await fetch(RAW, { cache: 'no-store' })
      if (!res.ok) throw new Error('fallback raw github names.json not found')
      return res.json()
    }
    __namesMapPromise = tryPrimary()
      .catch(() => tryFallback())
      .then((json) => {
        __namesMap = json || {}
        return __namesMap
      })
      .catch((err) => {
        console.warn('載入 names.json 失敗，改用 Yahoo 名稱', err)
        __namesMap = {}
        return __namesMap
      })
  }
  return __namesMapPromise
}

// 即時抓取單一股票資料
export async function fetchLiveStock(symbol) {
  try {
    // 確保股票代碼格式正確（加上 .TW 或 .TWO 後綴）
    let fullSymbol = symbol.toUpperCase()
    if (!fullSymbol.includes('.')) {
      // 預設嘗試 .TW，如果失敗則嘗試 .TWO
      fullSymbol = `${fullSymbol}.TW`
    }

    // 使用我們自己的 API 代理（避免 CORS 問題）
    const url = `/api/stock?symbol=${encodeURIComponent(fullSymbol)}`
    const response = await fetch(url)

    if (!response.ok) {
      // 如果 .TW 失敗，嘗試 .TWO
      if (fullSymbol.endsWith('.TW')) {
        const twoSymbol = fullSymbol.replace('.TW', '.TWO')
        return fetchLiveStock(twoSymbol)
      }
      throw new Error('股票不存在或無法取得資料')
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]
    if (!result) {
      throw new Error('無效的股票資料')
    }

    const meta = result.meta
    const quotes = result.indicators?.quote?.[0]
    const timestamps = result.timestamp || []
    
    if (!quotes || timestamps.length === 0) {
      throw new Error('無交易資料')
    }

    // 計算技術指標
    const closes = quotes.close || []
    const volumes = quotes.volume || []
    const validCloses = closes.filter(c => c != null)
    
    const closePrice = validCloses[validCloses.length - 1] || 0
    const prevClose = meta.chartPreviousClose || meta.previousClose || closePrice
    const change = closePrice - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0

    // 簡單 SMA 計算
    const sma5 = validCloses.length >= 5 
      ? validCloses.slice(-5).reduce((a, b) => a + b, 0) / 5 
      : closePrice
    const sma20 = validCloses.length >= 20 
      ? validCloses.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : closePrice

    // 簡單 RSI 計算
    let rsi = 50
    if (validCloses.length >= 14) {
      const changes = []
      for (let i = 1; i < validCloses.length; i++) {
        changes.push(validCloses[i] - validCloses[i - 1])
      }
      const recentChanges = changes.slice(-14)
      const gains = recentChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14
      const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14
      if (losses === 0) {
        rsi = 100
      } else {
        const rs = gains / losses
        rsi = 100 - (100 / (1 + rs))
      }
    }

    // 生成建議
    let action = 'hold'
    let reason = '價格持穩，建議觀察'
    
    if (closePrice > sma5 && sma5 > sma20 && rsi < 30) {
      action = 'buy'
      reason = `均線呈現多頭排列，RSI ${rsi.toFixed(1)} 超賣，建議逢低買進`
    } else if (closePrice < sma5 && sma5 < sma20 && rsi > 70) {
      action = 'sell'
      reason = `均線呈現空頭排列，RSI ${rsi.toFixed(1)} 超買，建議減碼`
    } else if (closePrice > sma20 && rsi < 50) {
      action = 'buy'
      reason = `價格站穩於20日均線之上，RSI ${rsi.toFixed(1)} 偏低，可考慮進場`
    } else if (closePrice < sma20 && rsi > 50) {
      action = 'sell'
      reason = `價格跌破20日均線，RSI ${rsi.toFixed(1)} 偏高，建議觀望或減碼`
    }

    // 嘗試以 names.json 取得中文名稱
    const namesMap = await loadNamesMap()
    const mappedName = namesMap[fullSymbol]

    return {
      symbol: fullSymbol,
      name: mappedName || meta.longName || meta.shortName || fullSymbol,
      price: Math.round(closePrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: volumes[volumes.length - 1] || 0,
      recommendation: {
        action,
        reason,
        confidence: 0.65
      },
      isLive: true // 標記這是即時抓取的
    }
  } catch (error) {
    console.error('即時抓取股票失敗:', error)
    throw error
  }
}
