#!/usr/bin/env python3
"""
輕量版每日股票資料更新腳本（無外部依賴）
- 僅使用 Python 標準庫（urllib、json、datetime、pathlib）
- 直接呼叫 Yahoo Finance Chart API 抓 3 個月日資料
- 計算 SMA 與 RSI，生成投資建議
- 寫入 public/data.json 與 history/YYYY-MM-DD.json

使用時機：本機環境無法安裝 pip/yfinance 時的替代方案。
"""

import json
import os
from urllib.request import urlopen, Request
from urllib.parse import quote as url_quote
from html.parser import HTMLParser
from datetime import datetime
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / 'config.json'
OUTPUT_PATH = Path(__file__).parent.parent / 'public' / 'data.json'
HISTORY_DIR = Path(__file__).parent.parent / 'history'

YF_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=3mo&interval=1d"
TWSE_ISIN_URL = "https://isin.twse.com.tw/isin/C_public.jsp?strMode={mode}"


def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def http_get_json(url: str):
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari'
    })
    with urlopen(req, timeout=30) as resp:
        data = resp.read()
        return json.loads(data.decode('utf-8'))


def http_get_text(url: str) -> str:
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari'
    })
    with urlopen(req, timeout=30) as resp:
        raw = resp.read()
    # 嘗試多種常見編碼
    for enc in ('utf-8', 'big5', 'cp950', 'big5-hkscs'):
        try:
            text = raw.decode(enc)
            if '<table' in text.lower() or '有價證券代號' in text:
                return text
        except Exception:
            pass
    # 最後退回 utf-8 忽略錯誤
    return raw.decode('utf-8', errors='ignore')


class _ISINTableParser(HTMLParser):
    """極簡 HTML 表格解析器，抓取 TWSE ISIN 主表的 TD 文字。
    期望欄序：
    0: 有價證券代號及名稱, 1: ISIN, 2: 上市/上櫃日, 3: 市場別, 4: 產業別, 5: CFICode, 6: 備註
    """
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.in_tr = False
        self.current_row = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'tr':
            self.in_tr = True
            self.current_row = []
        elif tag.lower() == 'td' and self.in_tr:
            self.in_td = True

    def handle_endtag(self, tag):
        if tag.lower() == 'td':
            self.in_td = False
        elif tag.lower() == 'tr':
            if self.in_tr and self.current_row:
                self.rows.append([cell.strip() for cell in self.current_row])
            self.in_tr = False

    def handle_data(self, data):
        if self.in_td:
            self.current_row.append(data)


def fetch_isin_rows(mode: int) -> list:
    """抓取 TWSE ISIN 表格列資料。
    mode=2: 上市, mode=4: 上櫃
    回傳：list[list[str]]
    """
    html = http_get_text(TWSE_ISIN_URL.format(mode=mode))
    parser = _ISINTableParser()
    parser.feed(html)
    # 濾掉可能的標題列（通常第一列包含「有價證券代號及名稱」關鍵字）
    rows = [r for r in parser.rows if len(r) >= 5]
    rows = [r for r in rows if '有價證券代號及名稱' not in r[0]]
    return rows


def is_allowed_security(code: str, row: list) -> bool:
    """判斷是否為我們要收錄的代碼。
    規則：
    - 一般股票：4 碼純數字 (例：2330)
    - ETF/ETN：純數字且以 '00' 或 '02' 開頭（允許 5~6 碼，如 0050、006201、0200x…）
    - 其他（權證/牛熊/結構型等 03/04/05… 開頭或含字母）排除
    - 若產業別欄位為『受益證券』，也允許（保險起見）
    """
    try:
        industry = row[4] if len(row) > 4 else ''
    except Exception:
        industry = ''

    if code.isdigit():
        if len(code) == 4:
            return True
        if code.startswith('00') or code.startswith('02'):
            # ETF/ETN 常見於 00xxx/006xxx/009xxx、ETN 多為 02xxx
            return True
        # 其他純數字但非上述規則，多半為權證等，排除
        return industry == '受益證券'
    # 非純數字（帶字母），排除
    return False


def build_tw_all_universe(include_otc=True, include_sectors=None, include_etf=False, include_all_sectors=False) -> tuple:
    """抓取台股全市場股票與ETF
    include_all_sectors: True時忽略 include_sectors，抓取所有產業
    """
    if include_sectors is None:
        include_sectors = []

    tickers = []
    name_map = {}
    try:
        # 上市
        rows = fetch_isin_rows(2)
        for r in rows:
            if len(r) < 5:
                continue
            # r[0]=代號及名稱，如 "2330 台積電" 或 "0050 元大台灣50"
            # r[4]=產業別
            code = r[0].split()[0]
            cname = r[0].split(maxsplit=1)[1] if len(r[0].split(maxsplit=1)) > 1 else code
            
            # ETF / 一般股票處理（加上代碼過濾）
            if include_etf and r[4] == '受益證券' and is_allowed_security(code, r):
                sym = f"{code}.TW"
                tickers.append(sym)
                name_map[sym] = cname
                continue

            if include_all_sectors:
                if is_allowed_security(code, r):
                    sym = f"{code}.TW"
                    tickers.append(sym)
                    name_map[sym] = cname
            elif include_sectors and r[4] in include_sectors:
                if is_allowed_security(code, r):
                    sym = f"{code}.TW"
                    tickers.append(sym)
                    name_map[sym] = cname
        
        # 上櫃
        if include_otc:
            rows = fetch_isin_rows(4)
            for r in rows:
                if len(r) < 5:
                    continue
                code = r[0].split()[0]
                cname = r[0].split(maxsplit=1)[1] if len(r[0].split(maxsplit=1)) > 1 else code
                
                # ETF / 一般股票處理（加上代碼過濾）
                if include_etf and r[4] == '受益證券' and is_allowed_security(code, r):
                    sym = f"{code}.TWO"
                    tickers.append(sym)
                    name_map[sym] = cname
                    continue

                if include_all_sectors:
                    if is_allowed_security(code, r):
                        sym = f"{code}.TWO"
                        tickers.append(sym)
                        name_map[sym] = cname
                elif include_sectors and r[4] in include_sectors:
                    if is_allowed_security(code, r):
                        sym = f"{code}.TWO"
                        tickers.append(sym)
                        name_map[sym] = cname
        
        # 去重排序
        tickers = sorted(list(dict.fromkeys(tickers)))
    except Exception as e:
        print(f"⚠️ 取得台股清單失敗：{e}")
        tickers = []
    return tickers, name_map


def last_valid(values):
    for v in reversed(values):
        if v is not None:
            return v
    return None


def prev_last_valid(values):
    found = 0
    for v in reversed(values):
        if v is not None:
            found += 1
            if found == 2:
                return v
    return None


def sma(values, period):
    arr = [v for v in values if v is not None]
    if len(arr) < period:
        return None
    return sum(arr[-period:]) / period


def rsi(values, period=14):
    # 使用最後 period 區間的簡化 RSI 計算
    arr = [v for v in values if v is not None]
    if len(arr) < period + 1:
        return None
    deltas = [arr[i] - arr[i-1] for i in range(1, len(arr))]
    gains = [max(d, 0) for d in deltas]
    losses = [max(-d, 0) for d in deltas]
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(values, fast=12, slow=26, signal=9):
    """計算 MACD (Moving Average Convergence Divergence)
    回傳：(macd_line, signal_line, histogram)
    """
    arr = [v for v in values if v is not None]
    if len(arr) < slow:
        return None, None, None
    
    # EMA 計算
    def ema(data, period):
        multiplier = 2 / (period + 1)
        ema_val = sum(data[:period]) / period
        for price in data[period:]:
            ema_val = (price - ema_val) * multiplier + ema_val
        return ema_val
    
    ema_fast = ema(arr, fast)
    ema_slow = ema(arr, slow)
    macd_line = ema_fast - ema_slow
    
    # 計算信號線（MACD 的 9 日 EMA）
    if len(arr) < slow + signal:
        return macd_line, None, None
    
    # 簡化：使用最近的 MACD 值計算信號線
    macd_values = []
    for i in range(slow, len(arr)):
        ema_f = ema(arr[:i+1], fast)
        ema_s = ema(arr[:i+1], slow)
        macd_values.append(ema_f - ema_s)
    
    signal_line = ema(macd_values, signal) if len(macd_values) >= signal else None
    histogram = (macd_line - signal_line) if signal_line else None
    
    return macd_line, signal_line, histogram


def detect_divergence(prices, rsi_values):
    """偵測 RSI 背離
    回傳：'bullish' (牛市背離), 'bearish' (熊市背離), None
    """
    if len(prices) < 20 or len(rsi_values) < 20:
        return None
    
    recent_prices = prices[-20:]
    recent_rsi = rsi_values[-20:]
    
    # 牛市背離：價格創新低但 RSI 未創新低
    price_low_idx = recent_prices.index(min(recent_prices))
    if price_low_idx > 10:  # 確保低點在近期
        earlier_prices = recent_prices[:price_low_idx]
        earlier_rsi = recent_rsi[:price_low_idx]
        if earlier_prices and earlier_rsi:
            if min(recent_prices) < min(earlier_prices) and min(recent_rsi) > min(earlier_rsi):
                return 'bullish'
    
    # 熊市背離：價格創新高但 RSI 未創新高
    price_high_idx = recent_prices.index(max(recent_prices))
    if price_high_idx > 10:
        earlier_prices = recent_prices[:price_high_idx]
        earlier_rsi = recent_rsi[:price_high_idx]
        if earlier_prices and earlier_rsi:
            if max(recent_prices) > max(earlier_prices) and max(recent_rsi) < max(earlier_rsi):
                return 'bearish'
    
    return None


def recommend(sma5, sma20, sma200, rsi_val, macd_line, signal_line, histogram, volume_trend, divergence, cfg_ind):
    """整合多指標的建議演算法
    參數：
    - sma5, sma20, sma200: 短中長期均線
    - rsi_val: RSI 值
    - macd_line, signal_line, histogram: MACD 指標
    - volume_trend: 成交量趨勢 ('increasing', 'decreasing', 'neutral')
    - divergence: 背離狀態 ('bullish', 'bearish', None)
    """
    action = 'hold'
    reason = '價格持穩，建議續抱觀察'
    confidence = 0.50
    signals = []
    
    # === 策略 1: RSI + MA(200) 長期趨勢 + 短期超賣 ===
    if sma200 and sma20 and sma20 > sma200 and rsi_val and rsi_val < 40:
        signals.append('順勢超賣')
        action = 'buy'
        reason = f"價格位於200日均線多頭趨勢，RSI {rsi_val:.1f} 顯示短期超賣，順勢買入良機"
        confidence = 0.78
    
    # === 策略 2: RSI + MACD 雙重確認 ===
    if macd_line is not None and signal_line is not None and histogram is not None:
        macd_golden_cross = histogram > 0 and macd_line > signal_line
        macd_death_cross = histogram < 0 and macd_line < signal_line
        
        if macd_golden_cross and rsi_val and rsi_val < 50:
            signals.append('MACD金叉+RSI偏低')
            if action != 'buy' or confidence < 0.75:
                action = 'buy'
                reason = f"MACD黃金交叉且RSI {rsi_val:.1f} 偏低，趨勢轉強訊號明確"
                confidence = 0.76
        
        if macd_death_cross and rsi_val and rsi_val > 50:
            signals.append('MACD死叉+RSI偏高')
            action = 'sell'
            reason = f"MACD死亡交叉且RSI {rsi_val:.1f} 偏高，趨勢轉弱建議減碼"
            confidence = 0.73
    
    # === 策略 3: RSI + Volume 背離確認 ===
    if divergence == 'bullish' and volume_trend == 'increasing':
        signals.append('牛市背離+量增')
        action = 'buy'
        reason = f"RSI牛市背離且成交量放大，買盤進場趨勢反轉機率高 (RSI {rsi_val:.1f})"
        confidence = 0.80
    
    if divergence == 'bearish' and (volume_trend == 'increasing' or volume_trend == 'decreasing'):
        signals.append('熊市背離')
        action = 'sell'
        reason = f"RSI熊市背離，多頭動能減弱應留意 (RSI {rsi_val:.1f})"
        confidence = 0.75
    
    # === 傳統策略作為備選 ===
    if not signals:  # 無特殊訊號時使用傳統邏輯
        if sma5 and sma20 and rsi_val:
            if sma5 > sma20 and rsi_val < cfg_ind['rsi_oversold']:
                action = 'buy'
                reason = f"5日均線黃金交叉20日均線，RSI {rsi_val:.1f} 顯示超賣，建議逢低買進"
                confidence = 0.72
            elif sma5 < sma20 and rsi_val > cfg_ind['rsi_overbought']:
                action = 'sell'
                reason = f"5日均線跌破20日均線，RSI {rsi_val:.1f} 超買，建議減碼"
                confidence = 0.68
            elif rsi_val < cfg_ind['rsi_oversold']:
                action = 'buy'
                reason = f"RSI {rsi_val:.1f} 顯示超賣，有反彈機會"
                confidence = 0.63
            elif rsi_val > cfg_ind['rsi_overbought']:
                action = 'sell'
                reason = f"RSI {rsi_val:.1f} 超買，建議獲利了結"
                confidence = 0.58
            elif sma5 > sma20:
                action = 'hold'
                reason = '均線呈多頭排列，價格穩健，建議續抱'
                confidence = 0.62
            else:
                action = 'hold'
                reason = '價格持穩於均線附近，靜待明確訊號'
                confidence = 0.52
    
    return {
        'action': action,
        'reason': reason,
        'confidence': round(confidence, 2),
        'signals': signals  # 記錄觸發的訊號組合
    }


def process_symbol(symbol: str, cfg, name_map=None):
    url = YF_CHART_URL.format(symbol=url_quote(symbol))
    j = http_get_json(url)
    result = j.get('chart', {}).get('result')
    if not result:
        print(f"❌ {symbol} 抓取失敗")
        return None
    r0 = result[0]
    qdata = r0.get('indicators', {}).get('quote', [{}])[0]
    closes = qdata.get('close', [])
    volumes = qdata.get('volume', [])

    close_price = last_valid(closes)
    prev_close = prev_last_valid(closes) or close_price
    if close_price is None:
        print(f"❌ {symbol} 無有效收盤價")
        return None

    change = close_price - prev_close
    change_percent = (0 if prev_close == 0 else (change / prev_close * 100))

    # 計算多種技術指標
    sma5 = sma(closes, 5)
    sma20 = sma(closes, 20)
    sma200 = sma(closes, 200)
    rsi_v = rsi(closes, cfg['indicators']['rsi_period'])
    macd_line, signal_line, histogram = macd(closes)
    
    # 成交量趨勢
    volume_trend = 'neutral'
    if len(volumes) >= 10:
        recent_vol = [v for v in volumes[-5:] if v]
        earlier_vol = [v for v in volumes[-10:-5] if v]
        if recent_vol and earlier_vol:
            avg_recent = sum(recent_vol) / len(recent_vol)
            avg_earlier = sum(earlier_vol) / len(earlier_vol)
            if avg_recent > avg_earlier * 1.2:
                volume_trend = 'increasing'
            elif avg_recent < avg_earlier * 0.8:
                volume_trend = 'decreasing'
    
    # 背離偵測
    rsi_values = []
    for i in range(14, len(closes)):
        r = rsi(closes[:i+1], 14)
        if r:
            rsi_values.append(r)
    divergence = detect_divergence(closes, rsi_values) if len(rsi_values) > 20 else None

    recommendation = recommend(
        sma5, sma20, sma200, rsi_v, 
        macd_line, signal_line, histogram, 
        volume_trend, divergence, 
        cfg['indicators']
    )

    # 友善名稱
    disp_name = None
    if name_map:
        disp_name = name_map.get(symbol)
    if not disp_name:
        disp_name = symbol.split('.')[0]

    return {
        'symbol': symbol,  # 保留 .TW/.TWO 後綴，便於前端名稱對應
        'name': disp_name,
        'price': round(close_price, 2),
        'change': round(change, 2),
        'changePercent': round(change_percent, 2),
        'volume': int(volumes[-1] or 0) if volumes else 0,
        'recommendation': recommendation
    }


def main():
    print("🚀 (輕量) 開始更新股票資料…\n")
    cfg = load_config()

    # 支援 universe 動態清單（標準庫解析 ISIN 表格）
    uni = cfg.get('universe', {}) or {}
    if uni.get('enabled'):
        include_otc = bool(uni.get('includeOTC', True))
        include_etf = bool(uni.get('includeETF', False))
        include_all_sectors = bool(uni.get('includeAllSectors', False))
        sectors = uni.get('includeSectors')
        print(f"🧭 使用 universe 設定，動態取得台股{'全市場股票+ETF' if include_all_sectors else '指定產業股票+ETF' if include_etf else '指定產業股票'}清單…")
        watchlist, name_map = build_tw_all_universe(
            include_otc=include_otc,
            include_sectors=sectors,
            include_etf=include_etf,
            include_all_sectors=include_all_sectors
        )
        if not watchlist:
            print("⚠️ 動態清單取得失敗，回退使用 watchlist 設定")
            watchlist = cfg.get('watchlist', [])
            name_map = {}
    else:
        watchlist = cfg.get('watchlist', [])
        # 嘗試建立全市場名稱映射，讓 watchlist 也能有名稱（加入代碼過濾）
        name_map = {}
        try:
            for mode, suffix in ((2, '.TW'), (4, '.TWO')):
                rows = fetch_isin_rows(mode)
                for r in rows:
                    if len(r) >= 1:
                        code = r[0].split()[0]
                        cname = r[0].split(maxsplit=1)[1] if len(r[0].split(maxsplit=1)) > 1 else code
                        if is_allowed_security(code, r):
                            name_map[f"{code}{suffix}"] = cname
        except Exception:
            pass

    if not watchlist:
        print("❌ 無追蹤清單，請於 scripts/config.json 設定 watchlist 或啟用 universe")
        return
    preview = ", ".join(watchlist[:20]) + (" …" if len(watchlist) > 20 else "")
    print(f"📋 追蹤股票（{len(watchlist)}）：{preview}\n")

    stocks = []
    for sym in watchlist:
        try:
            res = process_symbol(sym, cfg, name_map)
            if res:
                stocks.append(res)
                print(f"✅ {sym}: ${res['price']:.2f} ({res['changePercent']:+.2f}%) - {res['recommendation']['action'].upper()}")
        except Exception as e:
            print(f"⚠️ {sym} 失敗：{e}")

    if not stocks:
        print("\n❌ 沒有成功抓取任何股票資料")
        return

    output = {
        'updatedAt': datetime.now().isoformat(),
        'stocks': stocks
    }

    os.makedirs(OUTPUT_PATH.parent, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n💾 已儲存至 {OUTPUT_PATH}")

    HISTORY_DIR.mkdir(exist_ok=True)
    today = datetime.now().strftime('%Y-%m-%d')
    with open(HISTORY_DIR / f"{today}.json", 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"📅 已儲存歷史快照至 {HISTORY_DIR / (today + '.json')}")

    # 產出全市場名稱映射（public/names.json），供前端即時查詢使用（加入代碼過濾，避免檔案過大）
    try:
        full_name_map = {}
        for mode, suffix in ((2, '.TW'), (4, '.TWO')):
            rows = fetch_isin_rows(mode)
            for r in rows:
                if len(r) >= 1:
                    parts = r[0].split()
                    if not parts:
                        continue
                    code = parts[0]
                    cname = r[0].split(maxsplit=1)[1] if len(r[0].split(maxsplit=1)) > 1 else code
                    if is_allowed_security(code, r):
                        full_name_map[f"{code}{suffix}"] = cname
        names_path = Path(__file__).parent.parent / 'public' / 'names.json'
        with open(names_path, 'w', encoding='utf-8') as nf:
            json.dump(full_name_map, nf, ensure_ascii=False)
        size_kb = names_path.stat().st_size // 1024 if names_path.exists() else 0
        print(f"📝 已輸出名稱映射至 {names_path}（{len(full_name_map)} 筆，約 {size_kb} KB）")
    except Exception as e:
        print(f"⚠️ 無法輸出名稱映射：{e}")

    print(f"\n🎉 完成！成功更新 {len(stocks)} 檔股票")


if __name__ == '__main__':
    main()
