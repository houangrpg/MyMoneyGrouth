import { useEffect } from 'react'

function Filters({
  query,
  setQuery,
  actionFilter,
  setActionFilter,
  pageSize,
  setPageSize,
  onAnyChange,
}) {
  // 當任一過濾條件改變時，通知父層（通常用來重置頁碼）
  useEffect(() => {
    if (onAnyChange) onAnyChange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, actionFilter, pageSize])

  return (
    <section className="filters">
      <div className="filters-row">
        <div className="filter-item">
          <label htmlFor="search">搜尋</label>
          <input
            id="search"
            type="text"
            placeholder="輸入代碼或名稱…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="action">建議</label>
          <select
            id="action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="buy">買入</option>
            <option value="hold">持有</option>
            <option value="sell">賣出</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="pageSize">每頁</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </section>
  )
}

export default Filters
