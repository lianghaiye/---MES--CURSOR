/**
 * 外站文档链接（飞书 Wiki 等）：支持完整 https，也支持粘贴无协议域名
 */

export function normalizeExternalUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return { ok: false, message: '请填写外站文档链接' }
  if (/^(javascript|data|vbscript|file):/i.test(raw)) {
    return { ok: false, message: '不支持的链接协议' }
  }

  // 站内相对路径：场景/新手本期要求外站，明确拦截
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return { ok: false, message: '请填写外站文档链接（如飞书 Wiki），不要填系统内路径' }
  }

  let candidate = raw
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/\//, '')}`
  }

  try {
    const u = new URL(candidate)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, message: '仅支持 http / https 链接' }
    }
    if (!u.hostname) return { ok: false, message: '链接格式不正确' }
    return { ok: true, url: u.href }
  } catch {
    return { ok: false, message: '链接格式不正确' }
  }
}

/** 新标签页打开外站文档 */
export function openExternalLink(input) {
  const res = normalizeExternalUrl(input)
  if (!res.ok) return res
  window.open(res.url, '_blank', 'noopener,noreferrer')
  return res
}
