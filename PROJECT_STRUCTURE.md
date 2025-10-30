# 專案目錄結構規劃

## 建議的目錄結構

```
MyMoneyGrouth/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # 前端部署 workflow（可選，Vercel 自動部署）
│       └── update-data.yml     # 每日資料更新 workflow
│
├── public/                     # 靜態資源（Vercel 直接服務）
│   ├── data.json              # 當日股票資料與建議（動態產生）
│   ├── favicon.ico
│   └── robots.txt
│
├── src/                        # 前端原始碼
│   ├── components/
│   │   ├── StockCard.jsx      # 股票卡片元件
│   │   ├── StockList.jsx      # 股票列表容器
│   │   └── Header.jsx         # 頁面標題與更新時間
│   │
│   ├── styles/
│   │   ├── main.css           # 主樣式（或使用 Tailwind）
│   │   └── responsive.css     # RWD 斷點
│   │
│   ├── utils/
│   │   ├── formatter.js       # 格式化工具（金額、百分比、日期）
│   │   └── fetcher.js         # data.json 讀取邏輯
│   │
│   ├── App.jsx                # 主應用元件
│   └── main.jsx               # 應用入口
│
├── scripts/                    # 資料管線腳本
│   ├── update_data.py         # 主要執行腳本（抓取 + 計算 + 產生 JSON）
│   ├── fetch_stocks.py        # 股價資料抓取模組
│   ├── calculate_indicators.py # 技術指標計算模組
│   ├── generate_recommendations.py # 建議產生邏輯
│   └── config.json            # 追蹤股票清單與參數設定
│
├── tests/                      # 測試檔案
│   ├── e2e/
│   │   └── stock-display.spec.js  # Playwright E2E 測試
│   │
│   ├── unit/
│   │   ├── test_indicators.py     # Python 單元測試
│   │   └── formatter.test.js      # JS 單元測試
│   │
│   └── fixtures/
│       └── mock-data.json         # 測試用合成資料
│
├── history/                    # 歷史資料快照（可選）
│   ├── 2025-10-28.json
│   ├── 2025-10-29.json
│   └── 2025-10-30.json
│
├── docs/                       # 文件
│   ├── Spec.md                # 系統設計說明書（已完成）
│   ├── API.md                 # API 規格（如需）
│   └── CHANGELOG.md           # 版本變更紀錄
│
├── .gitignore
├── package.json               # 前端依賴
├── vite.config.js             # Vite 建置設定
├── requirements.txt           # Python 依賴
├── vercel.json                # Vercel 部署設定（可選）
├── README.md                  # 專案說明（已完成）
└── LICENSE
```

## 檔案說明

### 關鍵檔案

#### scripts/config.json（系統設定）
```json
{
  "watchlist": ["2330.TW", "2317.TW", "2454.TW"],
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
```

#### scripts/update_data.py（主腳本骨架）
```python
#!/usr/bin/env python3
"""
每日股票資料更新腳本
執行流程：
1. 讀取 config.json
2. 抓取股價資料（Yahoo Finance）
3. 計算技術指標
4. 產生投資建議
5. 寫入 public/data.json
"""

import json
from datetime import datetime
from fetch_stocks import fetch_stock_data
from calculate_indicators import calculate_indicators
from generate_recommendations import generate_recommendation

def main():
    # 讀取設定
    with open('scripts/config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    stocks = []
    for symbol in config['watchlist']:
        # 抓取股價
        stock_data = fetch_stock_data(symbol)
        
        # 計算指標
        indicators = calculate_indicators(stock_data, config['indicators'])
        
        # 產生建議
        recommendation = generate_recommendation(indicators)
        
        stocks.append({
            'symbol': symbol.replace('.TW', ''),
            'name': stock_data['name'],
            'price': stock_data['close'],
            'change': stock_data['change'],
            'changePercent': stock_data['change_percent'],
            'volume': stock_data['volume'],
            'recommendation': recommendation
        })
    
    # 產生 data.json
    output = {
        'updatedAt': datetime.now().isoformat(),
        'stocks': stocks
    }
    
    with open('public/data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 資料更新完成：{len(stocks)} 檔股票")

if __name__ == '__main__':
    main()
```

#### .github/workflows/update-data.yml
```yaml
name: Update Stock Data

on:
  schedule:
    - cron: '0 0 * * 1-5'  # 每週一至五 08:00 UTC+8
  workflow_dispatch:  # 允許手動觸發

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Fetch and generate data
        run: |
          python scripts/update_data.py
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add public/data.json history/
          git diff --quiet && git diff --staged --quiet || git commit -m "chore: update stock data [skip ci]"
          git push
```

#### requirements.txt
```
yfinance>=0.2.31
pandas>=2.1.0
pandas-ta>=0.3.14b
requests>=2.31.0
```

#### package.json（前端依賴）
```json
{
  "name": "my-money-growth",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "tailwindcss": "^3.3.0"
  }
}
```

## 建立專案的步驟

### 1. 初始化前端專案
```bash
# 使用 Vite 建立 React 專案
npm create vite@latest . -- --template react

# 或使用 Vanilla JS
npm create vite@latest . -- --template vanilla
```

### 2. 安裝 Python 依賴
```bash
pip install -r requirements.txt
```

### 3. 建立目錄結構
```bash
mkdir -p .github/workflows public src/{components,styles,utils} scripts tests/{e2e,unit,fixtures} history docs
```

### 4. 設定 Git 忽略
```
# .gitignore
node_modules/
dist/
.DS_Store
*.pyc
__pycache__/
.env
.vercel
```

### 5. 本機測試
```bash
# 測試資料腳本
python scripts/update_data.py

# 啟動前端開發伺服器
npm run dev
```

## 部署檢查清單

- [ ] 前端建置無錯誤（`npm run build`）
- [ ] Python 腳本可執行（`python scripts/update_data.py`）
- [ ] GitHub Actions workflow 語法正確
- [ ] Vercel 專案已連結 GitHub repo
- [ ] 環境變數已設定（如需）

---

**注意**：此為建議結構，實際開發時可依需求調整。
