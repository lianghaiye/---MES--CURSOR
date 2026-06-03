/** 安全写入 localStorage，配额满时返回 false 而不抛错 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      return false
    }
    throw err
  }
}

export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
