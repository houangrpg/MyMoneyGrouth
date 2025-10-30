// Vercel Serverless Function - Yahoo Finance API 代理
export default async function handler(req, res) {
  // 設定 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 處理 OPTIONS 預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 只允許 GET 請求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 從 query 參數取得股票代碼和時間範圍
    const { symbol, range, interval } = req.query

    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol parameter' })
    }

    // 支援自訂範圍，預設 1 個月
    const timeRange = range || '1mo'
    const timeInterval = interval || '1d'
    
    // 如果使用 range 參數，使用簡單格式
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${timeInterval}&range=${timeRange}`
    
    // 如果 range 是 1y 或更長，使用時間戳確保獲取足夠資料
    if (timeRange === '1y' || timeRange === '2y' || timeRange === 'max') {
      const now = Math.floor(Date.now() / 1000)
      const yearAgo = now - (365 * 24 * 60 * 60) // 1 年前
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${yearAgo}&period2=${now}&interval=${timeInterval}`
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch stock data',
        status: response.status 
      })
    }

    const data = await response.json()
    
    // 返回資料
    return res.status(200).json(data)
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
