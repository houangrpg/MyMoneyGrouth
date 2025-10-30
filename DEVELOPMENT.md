# 本機開發指南

## ✅ 已完成項目

### 前端（React + Vite）
- ✅ 專案初始化完成
- ✅ 依賴已安裝（128 packages）
- ✅ 建置測試通過（dist/ 目錄已產生）
- ✅ UI 元件完成：
  - `Header.jsx`：標題與更新時間
  - `StockList.jsx`：股票列表容器
  - `StockCard.jsx`：單一股票卡片
  - `formatter.js`：格式化工具
- ✅ 響應式 CSS 完成（手機/平板/桌面）
- ✅ 示範資料準備好（public/data.json）

### 後端（Python 資料管線）
- ✅ 資料更新腳本完成（`scripts/update_data.py`）
- ✅ 設定檔準備好（`scripts/config.json`）
- ✅ 技術指標計算邏輯（MA、RSI）
- ✅ 投資建議產生邏輯

### 自動化（GitHub Actions）
- ✅ Workflow 設定完成（`.github/workflows/update-data.yml`）
- ✅ 每週一至五 08:00 自動執行

### 測試
- ✅ E2E 測試腳本（Playwright）
- ✅ 測試設定檔（playwright.config.js）

### 文件
- ✅ `README.md`：專案說明
- ✅ `Spec.md`：完整 SDD 規格（20 章）
- ✅ `PROJECT_STRUCTURE.md`：目錄結構規劃
- ✅ `QUICKSTART.md`：快速啟動指南
- ✅ `DEPLOYMENT.md`：部署指南
- ✅ `DEVELOPMENT.md`：本檔案

---

## 🚀 立即啟動前端

### 方法 1：開發伺服器（推薦）

```bash
# 在專案目錄執行
npm run dev
```

然後開啟瀏覽器：`http://localhost:5173`

你會看到：
- 💰 我的投資分析建議（標題）
- 3 張股票卡片（台積電、鴻海、聯發科）
- 響應式佈局（手機單欄、桌面三欄）

### 方法 2：正式環境預覽

```bash
# 建置
npm run build

# 預覽
npm run preview
```

開啟：`http://localhost:4173`

---

## 🐍 Python 資料管線（可選）

### 前置需求
```bash
# 確認 Python 版本（需 3.11+）
python3 --version

# 安裝 pip（如果沒有）
sudo apt install python3-pip  # Ubuntu/Debian
# 或
brew install python3  # macOS

# 安裝依賴
pip3 install -r requirements.txt
```

### 執行資料更新
```bash
python3 scripts/update_data.py
```

預期輸出：
```
🚀 開始更新股票資料...
📋 追蹤股票：2330.TW, 2317.TW, 2454.TW

📊 處理 2330.TW...
✅ 2330.TW: $580.00 (+2.48%) - BUY

🎉 完成！成功更新 3 檔股票
```

執行成功後：
- `public/data.json` 會被更新
- `history/2025-10-30.json` 會被建立
- 重新整理前端即可看到最新資料

---

## 📂 專案檔案總覽

```
MyMoneyGrouth/
├── 📄 已建立的核心檔案
│   ├── package.json          ✅ 前端依賴
│   ├── vite.config.js        ✅ Vite 設定
│   ├── index.html            ✅ 入口 HTML
│   ├── vercel.json           ✅ Vercel 設定
│   ├── playwright.config.js  ✅ 測試設定
│   ├── requirements.txt      ✅ Python 依賴
│   └── .gitignore            ✅ Git 忽略清單
│
├── 📁 src/ (前端原始碼)
│   ├── main.jsx              ✅ React 入口
│   ├── App.jsx               ✅ 主應用元件
│   ├── components/
│   │   ├── Header.jsx        ✅ 標題元件
│   │   ├── StockList.jsx     ✅ 列表元件
│   │   └── StockCard.jsx     ✅ 卡片元件
│   ├── styles/
│   │   └── main.css          ✅ 響應式樣式
│   └── utils/
│       └── formatter.js      ✅ 格式化工具
│
├── 📁 scripts/ (資料管線)
│   ├── config.json           ✅ 追蹤清單設定
│   └── update_data.py        ✅ 資料更新腳本
│
├── 📁 public/ (靜態檔案)
│   └── data.json             ✅ 股票資料（示範）
│
├── 📁 tests/ (測試)
│   └── e2e/
│       └── stock-display.spec.js  ✅ E2E 測試
│
├── 📁 .github/workflows/
│   └── update-data.yml       ✅ 自動化 workflow
│
├── 📁 docs/ (文件)
│   ├── Spec.md               ✅ 完整 SDD 規格
│   ├── README.md             ✅ 專案說明
│   ├── PROJECT_STRUCTURE.md  ✅ 結構規劃
│   ├── QUICKSTART.md         ✅ 快速啟動
│   ├── DEPLOYMENT.md         ✅ 部署指南
│   └── DEVELOPMENT.md        ✅ 本檔案
│
└── 📁 dist/ (建置輸出，已產生)
    ├── index.html
    └── assets/
```

---

## 🎯 下一步行動

### 今天可以做
1. ✅ **立即測試前端**
   ```bash
   npm run dev
   ```
   開啟 http://localhost:5173 查看效果

2. **調整追蹤股票**
   - 編輯 `scripts/config.json`
   - 修改 `watchlist` 陣列（例：新增 `"0050.TW"`）

3. **自訂樣式**
   - 修改 `src/styles/main.css`
   - 調整顏色、字體、間距等

### 本週可以做
1. **部署到 Vercel**
   - 參考 `DEPLOYMENT.md`
   - 推送到 GitHub → 連結 Vercel → 自動部署

2. **設定 GitHub Actions**
   - 啟用 Actions 權限
   - 測試手動觸發更新

3. **調整建議邏輯**
   - 修改 `scripts/update_data.py` 中的 `generate_recommendation()`
   - 調整 RSI 閾值、MA 週期等

### 未來可以擴充
- 新增更多技術指標（KD、MACD）
- 支援基金/ETF
- 歷史績效回測
- Web Push 通知
- 暗黑模式

---

## 🧪 測試指令

```bash
# 前端建置測試
npm run build

# 執行 E2E 測試（需先啟動開發伺服器）
npm run test:e2e

# 格式檢查（可選，需安裝 ESLint）
npm run lint

# Python 測試（可選，需先寫測試檔案）
pytest tests/
```

---

## 📊 效能檢查

### 使用瀏覽器 DevTools
1. 開啟前端：`npm run dev`
2. 按 F12 開啟 DevTools
3. **Network** 頁籤：檢查 data.json 載入時間（應 < 200ms）
4. **Lighthouse** 頁籤：跑分（目標 > 90）

### 預期效能
- **TTFB**: < 500ms
- **FCP**: < 1.5s
- **LCP**: < 2.5s
- **頁面大小**: ~150KB（含 React）

---

## 🐛 常見問題

### Q1: 前端顯示「資料載入失敗」
**A**: 確認 `public/data.json` 存在且格式正確（可用 JSON validator 檢查）

### Q2: Python 腳本執行失敗
**A**: 
```bash
# 檢查依賴是否安裝
pip3 list | grep yfinance

# 重新安裝
pip3 install --upgrade yfinance pandas pandas-ta
```

### Q3: 建置失敗
**A**:
```bash
# 清除 node_modules 重裝
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 取得協助

- **規格文件**: 查閱 `Spec.md` 了解系統設計
- **快速啟動**: 參考 `QUICKSTART.md`
- **部署問題**: 查看 `DEPLOYMENT.md`
- **技術問題**: 
  - [Vite 文件](https://vitejs.dev/)
  - [React 文件](https://react.dev/)
  - [yfinance 文件](https://pypi.org/project/yfinance/)

---

🎉 **開發環境已就緒，開始編碼吧！**

建議開啟兩個終端：
- 終端 1: `npm run dev`（前端開發伺服器）
- 終端 2: 編輯檔案或執行 Python 腳本
