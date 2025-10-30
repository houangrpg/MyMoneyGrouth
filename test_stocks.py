#!/usr/bin/env python3
import urllib.request
import json

# 測試特定股票
symbols = ['5478.TWO', '5478.TW', '6547.TWO', '6547.TW']
for sym in symbols:
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1mo'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode('utf-8'))
        if 'chart' in data and data['chart']['result']:
            result = data['chart']['result'][0]
            meta = result.get('meta', {})
            print(f'✅ {sym}: 找到資料 - {meta.get("longName", "")} ${meta.get("regularMarketPrice", 0)}')
        else:
            print(f'❌ {sym}: 無資料')
    except Exception as e:
        print(f'❌ {sym}: {e}')
