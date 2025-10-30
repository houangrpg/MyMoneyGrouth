# 我的投資分析建議系統

> 一個輕量級個人投資輔助工具，每日自動產生股票買賣建議

![Status](https://img.shields.io/badge/status-in%20planning-blue)
![Version](https://img.shields.io/badge/version-0.1.0-green)

## 📋 專案概述

這是一個以網頁形式執行的投資建議系統，特色包括：
- 📱 響應式設計（手機/平板/桌面）
- 🤖 每日自動更新股價與建議
- 💡 基於技術指標的買賣建議（MA、RSI 等）
- 🚀 快速載入（< 3 秒）
- 💰 低成本維護（完全免費或 < 300 NTD/月）

## 📁 專案文件

- **[Spec.md](./Spec.md)**：完整的系統設計說明書（SDD）
  - 包含需求分析、架構設計、API 規格、資料結構等
  - 建議從第 1 章開始閱讀以了解系統全貌

## 🚀 快速開始

### 階段 1：規劃（當前階段）
- [x] 撰寫 SDD 規格文件
- [ ] 確認追蹤股票清單（3～5 檔）
- [ ] 選定前端框架（React vs Vanilla JS）

### 階段 2：MVP 開發（預計 2 週）
- [ ] 建立前端 UI（單頁展示）
- [ ] 實作資料抓取腳本（Python + yfinance）
- [ ] 設定 GitHub Actions 自動化
- [ ] 部署到 Vercel

### 階段 3：測試與上線
- [ ] 端對端測試（Playwright）
- [ ] 效能優化（Lighthouse > 90）
- [ ] 正式上線

## 🛠️ 技術棧（規劃中）

### 前端
- React 18 + Vite 或 Vanilla JS
- Tailwind CSS
- Vercel 部署

### 資料管線
- Python 3.11+
- yfinance + pandas + pandas-ta
- GitHub Actions（定時執行）

### 資料儲存
- 靜態 JSON 檔案（Git 版本控制）

## 📊 系統架構

```
用戶瀏覽器
    ↓
Vercel CDN（HTML/CSS/JS）
    ↓
data.json（每日更新）
    ↑
GitHub Actions（每日 08:00 執行）
    ↑
Yahoo Finance API
```

## 📖 如何閱讀規格文件

1. **快速了解**：閱讀 `Spec.md` 的「執行摘要」與第 1～3 章
2. **功能細節**：參考第 4～7 章（用例、功能卡、API、資料設計）
3. **技術實作**：查看第 9、12、14 章（NFR、部署、測試）
4. **未來規劃**：第 18 章里程碑

## 🤝 貢獻指南

目前為個人專案，暫不開放外部貢獻。

## ⚠️ 免責聲明

本系統僅供個人學習與參考使用，不構成任何投資建議。投資有風險，使用者需自行評估並承擔相關風險。

## 📄 授權

MIT License

---

**維護者**：Joe  
**最後更新**：2025-10-30
