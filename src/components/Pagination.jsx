function Pagination({ page, setPage, total, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  const goPrev = () => canPrev && setPage(page - 1)
  const goNext = () => canNext && setPage(page + 1)

  return (
    <nav className="pagination">
      <button disabled={!canPrev} onClick={goPrev}>
        上一頁
      </button>
      <span className="pagination-info">
        第 {page} / {totalPages} 頁（共 {total} 筆）
      </span>
      <button disabled={!canNext} onClick={goNext}>
        下一頁
      </button>
    </nav>
  )
}

export default Pagination
