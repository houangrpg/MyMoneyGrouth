import { useState, useEffect, useRef } from 'react'
import Header from './components/Header'
import StockList from './components/StockList'

function App() {
  const [stockData, setStockData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refreshTimer = useRef(null)

  const isMarketOpenNow = () => {
    try {
      // 以台北時區判斷
      const taipeiNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })
      )
      const day = taipeiNow.getDay() // 0=Sun, 6=Sat
      if (day === 0 || day === 6) return false
      const hh = taipeiNow.getHours()
      const mm = taipeiNow.getMinutes()
      const minutes = hh * 60 + mm
      // 交易時間（含緩衝）：08:45 ~ 13:35 台北時間
      return minutes >= (8 * 60 + 45) && minutes <= (13 * 60 + 35)
    } catch {
      return false
    }
  }

  useEffect(() => {
    fetchStockData()
    // 啟用每 30 秒自動更新（開盤期間）
    refreshTimer.current = setInterval(() => {
      if (isMarketOpenNow()) {
        fetchStockData(true)
      }
    }, 30000)
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current)
    }
  }, [])

  const fetchStockData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      
  // 讀取 data.json（加上 cache buster 避免快取）
  const response = await fetch(`/data.json?ts=${Date.now()}` , { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error('無法載入資料')
      }
      
      const data = await response.json()
      setStockData(data)
    } catch (err) {
      console.error('資料載入失敗:', err)
      setError(err.message)
      
      // 使用模擬資料作為備援
      setStockData({
        updatedAt: new Date().toISOString(),
        stocks: [
          {
            symbol: '2330',
            name: '台積電',
            price: 580.00,
            change: 14.00,
            changePercent: 2.48,
            volume: 23456789,
            recommendation: {
              action: 'buy',
              reason: '5日均線黃金交叉20日均線，RSI指標為28顯示超賣，建議逢低買進',
              confidence: 0.75
            }
          },
          {
            symbol: '2317',
            name: '鴻海',
            price: 105.50,
            change: -1.50,
            changePercent: -1.40,
            volume: 45678901,
            recommendation: {
              action: 'hold',
              reason: '價格持穩於均線附近，成交量平穩，建議續抱觀察',
              confidence: 0.60
            }
          },
          {
            symbol: '2454',
            name: '聯發科',
            price: 890.00,
            change: -25.00,
            changePercent: -2.73,
            volume: 12345678,
            recommendation: {
              action: 'sell',
              reason: '跌破20日均線支撐，RSI指標為75超買，建議減碼',
              confidence: 0.68
            }
          }
        ]
      })
    } finally {
      if (!silent) setLoading(false)
    }
  }

  return (
    <div className="app">
      <Header 
        updatedAt={stockData?.updatedAt} 
        isDemo={error !== null}
      />
      
      <main className="container">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>載入中...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="error-banner">
            ⚠️ {error} - 目前顯示示範資料
          </div>
        )}
        
        {!loading && stockData && (
          <StockList stocks={stockData.stocks} />
        )}
      </main>
      
      <footer className="footer">
        <p>⚠️ 本系統僅供參考，投資風險自負</p>
        <p>資料來源：Yahoo Finance</p>
      </footer>
    </div>
  )
}

export default App
