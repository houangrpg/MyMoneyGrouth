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
import os
from datetime import datetime, timedelta
from pathlib import Path

try:
    import yfinance as yf
    import pandas as pd
    import requests
except ImportError:
    print("❌ 請先安裝依賴：pip install -r requirements.txt")
    exit(1)


def load_config():
    """載入設定檔"""
    config_path = Path(__file__).parent / 'config.json'
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _fetch_isin_table(str_mode: int) -> pd.DataFrame:
    """從 TWSE ISIN 公開頁面抓取表格
    str_mode: 2=上市, 4=上櫃
    """
    url = f"https://isin.twse.com.tw/isin/C_public.jsp?strMode={str_mode}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
    }
    rs = requests.get(url, headers=headers, timeout=20)
    rs.encoding = 'utf-8'
    # 使用 pandas 解析 HTML 表格
    tables = pd.read_html(rs.text)
    if not tables:
        raise RuntimeError('無法解析 ISIN 表格')
    df = tables[0]
    # 正規化欄位名稱
    df.columns = [
        '有價證券代號及名稱', '國際證券辨識號碼', '上市日', '市場別', '產業別', 'CFICode', '備註'
    ]
    df = df.dropna(subset=['有價證券代號及名稱', '市場別'])
    return df


def get_tw_tech_tickers(include_otc: bool = True, include_sectors=None, include_etf: bool = False, etf_categories=None) -> list:
    """取得台股科技類（上市+上櫃）全部代碼，回傳 Yahoo Finance 代碼清單。
    include_sectors: 產業別白名單；預設涵蓋電子相關產業。
    include_etf: 是否包含 ETF
    etf_categories: ETF 類別關鍵字白名單
    """
    if include_sectors is None:
        include_sectors = [
            '電子工業', '半導體業', '電腦及週邊設備業', '通信網路業', '電子零組件業',
            '光電業', '電子通路業', '資訊服務業', '其他電子業'
        ]
    if etf_categories is None:
        etf_categories = ['科技', '半導體', '5G', '電動車', 'AI', '元宇宙']

    tickers = []
    try:
        # 上市
        df_listed = _fetch_isin_table(2)
        
        # ETF 處理
        if include_etf:
            df_etf = df_listed[df_listed['產業別'] == '受益證券']
            for val in df_etf['有價證券代號及名稱']:
                parts = str(val).split(maxsplit=1)
                code = parts[0].strip()
                name = parts[1].strip() if len(parts) > 1 else ''
                # 用名稱過濾科技相關 ETF
                if any(cat in name for cat in etf_categories):
                    tickers.append(f"{code}.TW")
        
        # 一般股票處理
        df_tech = df_listed[df_listed['產業別'].isin(include_sectors)]
        for val in df_tech['有價證券代號及名稱']:
            parts = str(val).split()
            code = parts[0].strip()
            if code.isdigit():
                tickers.append(f"{code}.TW")

        # 上櫃（可選）
        if include_otc:
            df_otc = _fetch_isin_table(4)
            
            # ETF 處理
            if include_etf:
                df_etf_otc = df_otc[df_otc['產業別'] == '受益證券']
                for val in df_etf_otc['有價證券代號及名稱']:
                    parts = str(val).split(maxsplit=1)
                    code = parts[0].strip()
                    name = parts[1].strip() if len(parts) > 1 else ''
                    if any(cat in name for cat in etf_categories):
                        tickers.append(f"{code}.TWO")
            
            # 一般股票處理
            df_tech_otc = df_otc[df_otc['產業別'].isin(include_sectors)]
            for val in df_tech_otc['有價證券代號及名稱']:
                parts = str(val).split()
                code = parts[0].strip()
                if code.isdigit():
                    tickers.append(f"{code}.TWO")

        # 去重並排序
        tickers = sorted(list(dict.fromkeys(tickers)))
    except Exception as e:
        print(f"⚠️ 取得台股科技清單失敗：{e}")
        tickers = []

    return tickers


def fetch_stock_data(symbol, period='3mo'):
    """抓取股票資料"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return None
        
        info = ticker.info
        
        return {
            'ticker': ticker,
            'history': hist,
            'info': info
        }
    except Exception as e:
        print(f"❌ {symbol} 抓取失敗: {e}")
        return None


def calculate_sma(prices, period):
    """計算簡單移動平均線"""
    if len(prices) < period:
        return None
    return prices[-period:].mean()


def calculate_rsi(prices, period=14):
    """計算 RSI 指標"""
    if len(prices) < period + 1:
        return None
    
    deltas = prices.diff()
    gain = deltas.where(deltas > 0, 0)
    loss = -deltas.where(deltas < 0, 0)
    
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi.iloc[-1]


def calculate_indicators(hist, config):
    """計算所有技術指標"""
    closes = hist['Close']
    
    sma_short = calculate_sma(closes, config['sma_short'])
    sma_long = calculate_sma(closes, config['sma_long'])
    rsi = calculate_rsi(closes, config['rsi_period'])
    
    return {
        'sma_short': sma_short,
        'sma_long': sma_long,
        'rsi': rsi
    }


def generate_recommendation(indicators, config):
    """產生投資建議"""
    sma_short = indicators.get('sma_short')
    sma_long = indicators.get('sma_long')
    rsi = indicators.get('rsi')
    
    # 預設持有
    action = 'hold'
    reason = '價格持穩，建議續抱觀察'
    confidence = 0.50
    
    # 買入條件：黃金交叉 + RSI 超賣
    if sma_short and sma_long and rsi:
        if sma_short > sma_long and rsi < config['rsi_oversold']:
            action = 'buy'
            reason = f'5日均線黃金交叉20日均線，RSI指標為{rsi:.1f}顯示超賣，建議逢低買進'
            confidence = 0.75
        
        # 賣出條件：死亡交叉 + RSI 超買
        elif sma_short < sma_long and rsi > config['rsi_overbought']:
            action = 'sell'
            reason = f'5日均線跌破20日均線，RSI指標為{rsi:.1f}超買，建議減碼'
            confidence = 0.70
        
        # 強勢買入：僅 RSI 超賣
        elif rsi < config['rsi_oversold']:
            action = 'buy'
            reason = f'RSI指標為{rsi:.1f}顯示超賣，有反彈機會'
            confidence = 0.65
        
        # 弱勢賣出：僅 RSI 超買
        elif rsi > config['rsi_overbought']:
            action = 'sell'
            reason = f'RSI指標為{rsi:.1f}超買，建議獲利了結'
            confidence = 0.60
        
        # 持有：趨勢向上
        elif sma_short > sma_long:
            action = 'hold'
            reason = '均線呈多頭排列，價格穩健，建議續抱'
            confidence = 0.65
        
        # 持有：趨勢向下但未觸發賣出
        else:
            action = 'hold'
            reason = '價格持穩於均線附近，靜待明確訊號'
            confidence = 0.55
    
    return {
        'action': action,
        'reason': reason,
        'confidence': round(confidence, 2)
    }


def process_stock(symbol, config):
    """處理單一股票"""
    print(f"📊 處理 {symbol}...")
    
    data = fetch_stock_data(symbol)
    if not data:
        return None
    
    hist = data['history']
    info = data['info']
    
    # 最新價格資訊
    latest = hist.iloc[-1]
    prev = hist.iloc[-2] if len(hist) > 1 else latest
    
    close_price = float(latest['Close'])
    prev_close = float(prev['Close'])
    change = close_price - prev_close
    change_percent = (change / prev_close) * 100
    
    # 計算指標
    indicators = calculate_indicators(hist, config['indicators'])
    
    # 產生建議
    recommendation = generate_recommendation(indicators, config['indicators'])
    
    # 組合結果
    result = {
        'symbol': symbol.replace('.TW', ''),
        'name': info.get('longName', info.get('shortName', symbol)),
        'price': round(close_price, 2),
        'change': round(change, 2),
        'changePercent': round(change_percent, 2),
        'volume': int(latest['Volume']),
        'recommendation': recommendation
    }
    
    print(f"✅ {symbol}: ${close_price:.2f} ({change_percent:+.2f}%) - {recommendation['action'].upper()}")
    
    return result


def save_to_json(data, output_path):
    """儲存為 JSON"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 已儲存至 {output_path}")


def save_history(data):
    """儲存歷史快照（可選）"""
    history_dir = Path(__file__).parent.parent / 'history'
    history_dir.mkdir(exist_ok=True)
    
    today = datetime.now().strftime('%Y-%m-%d')
    history_path = history_dir / f'{today}.json'
    
    with open(history_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"📅 已儲存歷史快照至 {history_path}")


def main():
    print("🚀 開始更新股票資料...\n")
    
    # 載入設定
    config = load_config()

    # 若設定啟用 universe，則動態取得台股科技清單
    watchlist = config.get('watchlist', [])
    uni = config.get('universe', {}) or {}
    if uni.get('enabled'):
        sectors = uni.get('includeSectors')
        include_otc = bool(uni.get('includeOTC', True))
        include_etf = bool(uni.get('includeETF', False))
        etf_cats = uni.get('etfCategories')
        print(f"🧭 使用 universe 設定，動態取得台股{'科技股票+ETF' if include_etf else '科技股票'}清單…")
        dynamic_list = get_tw_tech_tickers(
            include_otc=include_otc,
            include_sectors=sectors,
            include_etf=include_etf,
            etf_categories=etf_cats
        )
        if dynamic_list:
            watchlist = dynamic_list
        else:
            print("⚠️ 動態清單取得失敗，回退使用 watchlist 設定")

    print(f"📋 追蹤股票（共 {len(watchlist)} 檔）：{', '.join(watchlist[:20])}{' …' if len(watchlist)>20 else ''}\n")
    
    # 處理所有股票
    stocks = []
    for symbol in watchlist:
        result = process_stock(symbol, config)
        if result:
            stocks.append(result)
    
    if not stocks:
        print("\n❌ 沒有成功抓取任何股票資料")
        exit(1)
    
    # 組合輸出
    output = {
        'updatedAt': datetime.now().isoformat(),
        'stocks': stocks
    }
    
    # 儲存到 public/data.json
    output_path = Path(__file__).parent.parent / 'public' / 'data.json'
    save_to_json(output, output_path)
    
    # 儲存歷史快照
    save_history(output)
    
    print(f"\n🎉 完成！成功更新 {len(stocks)} 檔股票")
    print(f"⏰ 更新時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()
