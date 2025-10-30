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


def recommend(sma_short, sma_long, rsi_val, cfg_ind):
    action = 'hold'
    reason = '價格持穩，建議續抱觀察'
    confidence = 0.50
    if sma_short and sma_long and rsi_val:
        if sma_short > sma_long and rsi_val < cfg_ind['rsi_oversold']:
            action = 'buy'
            reason = f"5日均線黃金交叉20日均線，RSI指標為{rsi_val:.1f}顯示超賣，建議逢低買進"
            confidence = 0.75
        elif sma_short < sma_long and rsi_val > cfg_ind['rsi_overbought']:
            action = 'sell'
            reason = f"5日均線跌破20日均線，RSI指標為{rsi_val:.1f}超買，建議減碼"
            confidence = 0.70
        elif rsi_val < cfg_ind['rsi_oversold']:
            action = 'buy'
            reason = f"RSI指標為{rsi_val:.1f}顯示超賣，有反彈機會"
            confidence = 0.65
        elif rsi_val > cfg_ind['rsi_overbought']:
            action = 'sell'
            reason = f"RSI指標為{rsi_val:.1f}超買，建議獲利了結"
            confidence = 0.60
        elif sma_short > sma_long:
            action = 'hold'
            reason = '均線呈多頭排列，價格穩健，建議續抱'
            confidence = 0.65
        else:
            action = 'hold'
            reason = '價格持穩於均線附近，靜待明確訊號'
            confidence = 0.55
    return {
        'action': action,
        'reason': reason,
        'confidence': round(confidence, 2)
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

    sma_s = sma(closes, cfg['indicators']['sma_short'])
    sma_l = sma(closes, cfg['indicators']['sma_long'])
    rsi_v = rsi(closes, cfg['indicators']['rsi_period'])

    recommendation = recommend(sma_s, sma_l, rsi_v, cfg['indicators'])

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
