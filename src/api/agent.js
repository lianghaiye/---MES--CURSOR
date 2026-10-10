import { getToken, getUser } from '@/utils/auth'

/**
 * 开发环境直连本地 agent-proxy，避免 vue-dev-server 未加载 proxy 时出现 404。
 * 生产可配 VUE_APP_AGENT_BASE_URL（如 /agent-api）。
 */
function resolveAgentBase() {
  const fromEnv = process.env.VUE_APP_AGENT_BASE_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (process.env.NODE_ENV === 'development') return 'http://127.0.0.1:3100'
  return '/agent-api'
}

/**
 * 流式对话：事件 meta | delta | follow_up | error | done
 * @param {{ content: string, conversationId?: string, signal?: AbortSignal, onEvent: (type: string, data: any) => void }} opts
 */
export async function streamAgentChat({ content, conversationId, signal, onEvent }) {
  const user = getUser()
  const userId =
    String(user?.id || user?.userId || user?.username || user?.account || 'mes-user').slice(
      0,
      128,
    ) || 'mes-user'

  const token = getToken()
  const res = await fetch(`${resolveAgentBase()}/api/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      content,
      conversationId: conversationId || undefined,
      userId,
    }),
    signal,
  })

  if (!res.ok) {
    let message = `请求失败 HTTP ${res.status}`
    try {
      const json = await res.json()
      message = json.message || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  if (!res.body) {
    throw new Error('浏览器不支持流式响应')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let currentEvent = 'message'

  const emitBlock = (block) => {
    const lines = block.split(/\r?\n/)
    let eventName = currentEvent
    const dataLines = []
    for (const line of lines) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (!dataLines.length) return
    const raw = dataLines.join('\n')
    let data = {}
    try {
      data = JSON.parse(raw)
    } catch {
      data = { raw }
    }
    onEvent?.(eventName, data)
  }

  let streamDone = false
  while (!streamDone) {
    const { done, value } = await reader.read()
    if (done) {
      streamDone = true
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split(/\n\n/)
    buffer = parts.pop() || ''
    for (const part of parts) {
      if (part.trim()) emitBlock(part)
    }
  }
  if (buffer.trim()) emitBlock(buffer)
}
