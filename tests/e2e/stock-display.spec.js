import { test, expect } from '@playwright/test'

test.describe('投資分析建議系統', () => {
  test('首頁載入成功', async ({ page }) => {
    await page.goto('/')
    
    // 檢查標題
    await expect(page.locator('h1')).toContainText('我的投資分析建議')
    
    // 檢查是否有股票卡片
    const cards = page.locator('.stock-card')
    await expect(cards).toHaveCount(3) // 預設 3 檔股票
  })

  test('股票卡片顯示完整資訊', async ({ page }) => {
    await page.goto('/')
    
    // 等待載入完成
    await page.waitForSelector('.stock-card')
    
    const firstCard = page.locator('.stock-card').first()
    
    // 檢查必要元素
    await expect(firstCard.locator('h2')).toBeVisible() // 股票代號
    await expect(firstCard.locator('h3')).toBeVisible() // 股票名稱
    await expect(firstCard.locator('.price-value')).toBeVisible() // 價格
    await expect(firstCard.locator('.badge')).toBeVisible() // 建議標籤
    await expect(firstCard.locator('.recommendation-reason')).toBeVisible() // 理由
  })

  test('響應式設計 - 手機版', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // 檢查單欄佈局
    const list = page.locator('.stock-list')
    const computedStyle = await list.evaluate((el) => 
      window.getComputedStyle(el).gridTemplateColumns
    )
    
    // 手機版應該是單欄
    expect(computedStyle).toContain('1fr')
  })

  test('響應式設計 - 桌面版', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    
    // 檢查多欄佈局
    const list = page.locator('.stock-list')
    const computedStyle = await list.evaluate((el) => 
      window.getComputedStyle(el).gridTemplateColumns
    )
    
    // 桌面版應該是三欄
    expect(computedStyle.split(' ').length).toBeGreaterThanOrEqual(3)
  })

  test('建議類型排序正確', async ({ page }) => {
    await page.goto('/')
    
    const badges = page.locator('.badge')
    const firstBadge = await badges.first().textContent()
    
    // 第一個應該是買入（依排序規則）
    expect(firstBadge).toContain('買入')
  })
})
