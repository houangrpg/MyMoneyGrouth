import { formatDateTime } from '../utils/formatter'

function Header({ updatedAt, isDemo }) {
  return (
    <header className="header">
      <div className="header-content">
        <h1>💰 我的投資分析建議</h1>
        <div className="update-info">
          {isDemo && <span className="demo-badge">示範模式</span>}
          <span className="update-time">
            {updatedAt ? formatDateTime(updatedAt) : '載入中...'}
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header
