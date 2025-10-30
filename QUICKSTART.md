# 快速啟動指南

## 📋 前置需求

- Node.js 18+ 與 npm
- Python 3.11+
- Git
- GitHub 帳號
- Vercel 帳號（免費）

## 🚀 開發環境設定（5 步驟）

### 步驟 1：初始化前端專案

```bash
# 建立 React 專案（推薦）
npm create vite@latest . -- --template react

# 或 Vanilla JS（更輕量）
npm create vite@latest . -- --template vanilla

# 安裝依賴
npm install

# 安裝 Tailwind CSS（可選）
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 步驟 2：設定 Python 環境

```bash
# 建立虛擬環境
python -m venv venv

# 啟動虛擬環境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 建立 requirements.txt
cat > requirements.txt << EOF
yfinance>=0.2.31
pandas>=2.1.0
pandas-ta>=0.3.14b
requests>=2.31.0
EOF

# 安裝依賴
pip install -r requirements.txt
```

### 步驟 3：建立基本目錄結構

```bash
# 建立所需目錄
mkdir -p .github/workflows
mkdir -p public
mkdir -p src/{components,styles,utils}
mkdir -p scripts
mkdir -p tests/{e2e,unit,fixtures}
mkdir -p history
```

### 步驟 4：建立設定檔

#### scripts/config.json
```bash
cat > scripts/config.json << 'EOF'
{
  "watchlist": [
    "2330.TW",
    "2317.TW",
    "2454.TW"
  ],
  "indicators": {
    "sma_short": 5,
    "sma_long": 20,
    "rsi_period": 14,
    "rsi_oversold": 30,
    "rsi_overbought": 70
  },
  "schedule": {
    "timezone": "Asia/Taipei",
    "updateTime": "08:00"
  }
}
EOF
```

#### .github/workflows/update-data.yml
```bash
cat > .github/workflows/update-data.yml << 'EOF'
name: Update Stock Data

on:
  schedule:
    - cron: '0 0 * * 1-5'  # 週一至五 08:00 UTC+8
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Update data
        run: python scripts/update_data.py
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add public/data.json history/
          git diff --quiet && git diff --staged --quiet || \
            git commit -m "chore: update stock data [skip ci]"
          git push
EOF
```

### 步驟 5：測試執行

```bash
# 測試前端
npm run dev
# 開啟 http://localhost:5173

# 測試 Python 腳本（需先實作）
python scripts/update_data.py
```

## 🎯 最小可行腳本（MVP）

### scripts/update_data.py（簡化版）

```python
#!/usr/bin/env python3
import json
from datetime import datetime
import yfinance as yf

def main():
    # 讀取設定
    with open('scripts/config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    stocks = []
    
    for symbol in config['watchlist']:
        try:
            # 抓取股票資料
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period='3mo')
            
            if hist.empty:
                print(f"⚠️  {symbol} 無資料")
                continue
            
            # 最新收盤價
            latest = hist.iloc[-1]
            prev = hist.iloc[-2] if len(hist) > 1 else latest
            
            close_price = float(latest['Close'])
            change = close_price - float(prev['Close'])
            change_percent = (change / float(prev['Close'])) * 100
            
            # 簡易建議邏輯（暫時用隨機）
            if change_percent > 2:
                action = "buy"
                reason = f"股價上漲 {change_percent:.2f}%，動能強勁"
            elif change_percent < -2:
                action = "sell"
                reason = f"股價下跌 {change_percent:.2f}%，建議減碼"
            else:
                action = "hold"
                reason = "價格持穩，建議續抱觀察"
            
            stocks.append({
                'symbol': symbol.replace('.TW', ''),
                'name': info.get('longName', symbol),
                'price': round(close_price, 2),
                'change': round(change, 2),
                'changePercent': round(change_percent, 2),
                'volume': int(latest['Volume']),
                'recommendation': {
                    'action': action,
                    'reason': reason,
                    'confidence': 0.70
                }
            })
            
            print(f"✅ {symbol}: {close_price:.2f} ({change_percent:+.2f}%)")
            
        except Exception as e:
            print(f"❌ {symbol} 失敗: {e}")
    
    # 產生 JSON
    output = {
        'updatedAt': datetime.now().isoformat(),
        'stocks': stocks
    }
    
    with open('public/data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n🎉 完成！更新 {len(stocks)} 檔股票")

if __name__ == '__main__':
    main()
```

執行測試：
```bash
python scripts/update_data.py
```

## 📦 部署到 Vercel

### 1. 推送到 GitHub
```bash
git init
git add .
git commit -m "Initial commit: 投資分析系統 MVP"
git branch -M main
git remote add origin https://github.com/你的帳號/MyMoneyGrouth.git
git push -u origin main
```

### 2. 連結 Vercel
1. 前往 [vercel.com](https://vercel.com)
2. 點擊「Import Project」
3. 選擇 GitHub repo：`MyMoneyGrouth`
4. Framework Preset：Vite
5. 點擊「Deploy」

### 3. 驗證部署
- 開啟 `https://your-project.vercel.app`
- 檢查 `data.json` 是否可存取

## ✅ 檢查清單

### 開發環境
- [ ] Node.js 與 npm 已安裝
- [ ] Python 3.11+ 已安裝
- [ ] Git 已設定（`git config --global user.name/email`）
- [ ] VS Code 或其他編輯器已安裝

### 專案設定
- [ ] 前端專案已初始化（`npm create vite`）
- [ ] Python 虛擬環境已建立
- [ ] 目錄結構已建立
- [ ] `config.json` 已設定追蹤股票

### 測試
- [ ] 前端可本機執行（`npm run dev`）
- [ ] Python 腳本可執行（`python scripts/update_data.py`）
- [ ] `data.json` 產生成功

### 部署
- [ ] GitHub repo 已建立並推送
- [ ] Vercel 專案已連結
- [ ] 網站可正常訪問
- [ ] GitHub Actions 已啟用（檢查 Actions 頁籤）

## 🐛 常見問題

### Python 找不到模組
```bash
# 確認虛擬環境已啟動
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# 重新安裝依賴
pip install -r requirements.txt
```

### yfinance 抓不到資料
```python
# 確認股票代號格式
"2330.TW"  # ✅ 正確（台股需加 .TW）
"2330"     # ❌ 錯誤
```

### GitHub Actions 未觸發
- 檢查 cron 語法（UTC 時間，需轉換）
- 手動觸發：Actions → Update Stock Data → Run workflow

## 📚 下一步

1. **完善前端 UI**：參考 `Spec.md` 第 6 章實作元件
2. **加入技術指標**：使用 `pandas-ta` 計算 MA、RSI
3. **編寫測試**：Playwright E2E + Python 單元測試
4. **效能優化**：Lighthouse 跑分 > 90

---

🎉 **恭喜！你已完成基礎設定，可以開始開發了！**
