# 部署指南

## 🚀 快速部署到 Vercel

### 步驟 1：準備 Git Repository

```bash
# 初始化 Git（如果還沒做）
git init
git add .
git commit -m "feat: 完成投資分析系統 MVP"

# 推送到 GitHub
git branch -M main
git remote add origin https://github.com/你的帳號/MyMoneyGrouth.git
git push -u origin main
```

### 步驟 2：連結 Vercel

#### 方法 A：透過 Vercel Dashboard（推薦）

1. 前往 [vercel.com](https://vercel.com) 並登入
2. 點擊「Add New...」→「Project」
3. 選擇「Import Git Repository」
4. 選擇你的 GitHub repo：`MyMoneyGrouth`
5. 設定如下：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. 點擊「Deploy」

#### 方法 B：使用 Vercel CLI

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
vercel

# 正式環境部署
vercel --prod
```

### 步驟 3：驗證部署

1. 等待建置完成（約 1～2 分鐘）
2. 開啟 Vercel 提供的網址（例：`https://my-money-growth.vercel.app`）
3. 確認頁面正常顯示股票資料

---

## 🤖 設定 GitHub Actions 自動更新

### 步驟 1：啟用 Actions

1. 前往 GitHub repo → **Settings** → **Actions** → **General**
2. 確認「Allow all actions and reusable workflows」已勾選
3. 在「Workflow permissions」選擇「Read and write permissions」
4. 勾選「Allow GitHub Actions to create and approve pull requests」

### 步驟 2：測試手動執行

1. 前往 **Actions** 頁籤
2. 選擇「Update Stock Data」workflow
3. 點擊「Run workflow」→ 選擇 `main` 分支 → 點擊「Run workflow」
4. 等待執行完成（約 30 秒～1 分鐘）
5. 檢查 Commit 歷史，應該會看到新的 commit：`chore: update stock data ...`

### 步驟 3：驗證自動排程

排程設定為每週一至五 08:00（台灣時間），會自動執行。第一次執行後可在 Actions 頁面確認。

---

## 📊 驗證資料管線

### 本機測試資料腳本

```bash
# 安裝 Python 依賴（首次執行）
pip install -r requirements.txt

# 執行資料更新腳本
python scripts/update_data.py
```

預期輸出：
```
🚀 開始更新股票資料...

📋 追蹤股票：2330.TW, 2317.TW, 2454.TW

📊 處理 2330.TW...
✅ 2330.TW: $580.00 (+2.48%) - BUY

📊 處理 2317.TW...
✅ 2317.TW: $105.50 (-1.40%) - HOLD

📊 處理 2454.TW...
✅ 2454.TW: $890.00 (-2.73%) - SELL

💾 已儲存至 .../public/data.json
📅 已儲存歷史快照至 .../history/2025-10-30.json

🎉 完成！成功更新 3 檔股票
⏰ 更新時間：2025-10-30 14:32:15
```

---

## 🔧 設定自訂域名（可選）

### 在 Vercel 設定

1. 前往 Vercel Dashboard → 你的專案 → **Settings** → **Domains**
2. 輸入你的域名（例：`stocks.yourdomain.com`）
3. 依照指示設定 DNS（通常是 CNAME 記錄）
4. 等待 DNS 生效（最多 48 小時，通常 10 分鐘內）

### DNS 設定範例

```
類型: CNAME
名稱: stocks
值: cname.vercel-dns.com
```

---

## 📝 部署後檢查清單

### 前端檢查
- [ ] 網站可正常訪問
- [ ] 股票資料顯示正確
- [ ] 手機/桌面響應式正常
- [ ] 載入速度 < 3 秒（可用 Lighthouse 測試）

### 資料管線檢查
- [ ] GitHub Actions 可手動觸發
- [ ] 執行後 `public/data.json` 有更新
- [ ] Vercel 自動重新部署
- [ ] 網站資料同步更新

### 效能檢查
```bash
# 使用 Lighthouse CLI（可選）
npm install -g @lhci/cli
lhci autorun --collect.url=https://your-site.vercel.app
```

目標分數：
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

---

## 🐛 常見問題排查

### 問題 1：Vercel 建置失敗

**錯誤**: `Module not found: Can't resolve 'xxx'`

**解決方案**:
```bash
# 檢查 package.json 依賴是否完整
npm install

# 本機測試建置
npm run build
```

---

### 問題 2：GitHub Actions 執行失敗

**錯誤**: `Permission denied (publickey)`

**解決方案**:
1. 確認 repo 設定中 Actions 有「Read and write permissions」
2. 檢查 workflow 檔案語法是否正確

---

### 問題 3：data.json 沒有更新

**錯誤**: Python 腳本執行失敗

**排查步驟**:
```bash
# 本機測試
python scripts/update_data.py

# 檢查錯誤訊息
# 常見問題：yfinance 無法抓取資料（網路問題或股票代號錯誤）
```

---

### 問題 4：Vercel 沒有自動重新部署

**原因**: Git push 後 Vercel 沒有觸發

**解決方案**:
1. 檢查 Vercel Dashboard → Settings → Git → 確認已連結 repo
2. 手動觸發：Deployments → Redeploy

---

## 🎯 效能優化建議

### 1. 啟用 Gzip 壓縮
Vercel 預設已啟用，無需額外設定。

### 2. 圖片優化（未來擴充）
若新增圖片，使用 WebP 格式並設定適當尺寸。

### 3. Service Worker（未來擴充）
可新增離線支援，參考 Workbox。

---

## 📈 監控與維護

### 每日檢查（自動化）
- GitHub Actions 執行狀態（可設定失敗通知）
- Vercel Analytics 流量監控

### 每週檢查（手動）
- 檢查股價資料正確性
- 確認建議邏輯合理

### 每月維護
- 更新依賴套件：`npm update` 與 `pip list --outdated`
- 檢查 Vercel/GitHub 配額使用狀況

---

🎉 **恭喜！你的投資分析系統已成功部署！**

有任何問題可參考：
- [Vite 文件](https://vitejs.dev/)
- [Vercel 文件](https://vercel.com/docs)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
