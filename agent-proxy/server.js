/**
 * 泵小智 · 扣子 Coze 流式对话代理
 * - PAT 仅存在于本服务环境变量
 * - 前端：POST /api/agent/chat（SSE）
 */
const path = require('path')
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = Number(process.env.PORT || 3100)
const COZE_API_BASE = (process.env.COZE_API_BASE || 'https://api.coze.cn').replace(/\/$/, '')
const COZE_BOT_ID = String(process.env.COZE_BOT_ID || '').trim()
const COZE_PAT = String(process.env.COZE_PAT || '').trim()
const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH || 'true').toLowerCase() !== 'false'

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    botConfigured: Boolean(COZE_BOT_ID && COZE_PAT),
    botId: COZE_BOT_ID ? `${COZE_BOT_ID.slice(0, 6)}…` : null,
  })
})

function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next()
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ') || auth.length < 20) {
    return res.status(401).json({ code: 401, message: '请先登录后再使用泵小智' })
  }
  return next()
}

/**
 * 将扣子 SSE 转成前端更简单的事件：
 * event: meta | delta | follow_up | done | error
 */
app.post('/api/agent/chat', requireAuth, async (req, res) => {
  if (!COZE_BOT_ID || !COZE_PAT) {
    return res.status(500).json({
      code: 500,
      message: '代理未配置 COZE_BOT_ID / COZE_PAT，请检查 agent-proxy/.env',
    })
  }

  const content = String(req.body?.content || '').trim()
  if (!content) {
    return res.status(400).json({ code: 400, message: '请输入问题' })
  }

  const userId = String(req.body?.userId || req.body?.user_id || 'mes-user').slice(0, 128)
  const conversationId = String(req.body?.conversationId || req.body?.conversation_id || '').trim()

  const url = conversationId
    ? `${COZE_API_BASE}/v3/chat?conversation_id=${encodeURIComponent(conversationId)}`
    : `${COZE_API_BASE}/v3/chat`

  const payload = {
    bot_id: COZE_BOT_ID,
    user_id: userId,
    stream: true,
    auto_save_history: true,
    // 1024 = 扣子 API 渠道。调试页走的是开发预览，API 走已发布版本。
    connector_id: '1024',
    additional_messages: [
      {
        role: 'user',
        content,
        content_type: 'text',
      },
    ],
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  let upstream
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COZE_PAT}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    writeEvent('error', { message: `连接扣子失败：${err.message || err}` })
    writeEvent('done', {})
    return res.end()
  }

  const contentType = String(upstream.headers.get('content-type') || '')
  // 扣子鉴权失败时常见：HTTP 200 + JSON { code: 4101, msg: token incorrect }
  if (!upstream.ok || contentType.includes('application/json')) {
    let detail = ''
    try {
      detail = await upstream.text()
    } catch {
      /* ignore */
    }
    let message = `扣子接口错误 HTTP ${upstream.status}`
    try {
      const json = JSON.parse(detail)
      if (json?.code === 4101 || /token.*incorrect/i.test(String(json?.msg || ''))) {
        message =
          '扣子令牌无效（4101）。请重新生成个人访问令牌，写入 agent-proxy/.env 的 COZE_PAT 后重启代理。'
      } else if (json?.msg) {
        message = `扣子错误 ${json.code != null ? json.code + '：' : ''}${json.msg}`
      }
    } catch {
      if (detail) message += `：${detail.slice(0, 200)}`
    }
    writeEvent('error', { message, detail: detail.slice(0, 500) })
    writeEvent('done', {})
    return res.end()
  }

  const reader = upstream.body?.getReader?.()
  if (!reader) {
    writeEvent('error', { message: '扣子未返回可读流' })
    writeEvent('done', {})
    return res.end()
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let currentEvent = 'message'
  let closed = false

  req.on('close', () => {
    closed = true
    try {
      reader.cancel()
    } catch {
      /* ignore */
    }
  })

  const handleSseBlock = (block) => {
    const lines = block.split(/\r?\n/)
    let eventName = currentEvent
    const dataLines = []
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (!dataLines.length) return
    const raw = dataLines.join('\n')
    if (raw === '[DONE]' || eventName === 'done') {
      writeEvent('done', {})
      return
    }
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    if (
      eventName === 'conversation.chat.created' ||
      eventName === 'conversation.chat.in_progress'
    ) {
      writeEvent('meta', {
        conversationId: data.conversation_id,
        chatId: data.id,
        status: data.status,
      })
      return
    }

    if (eventName === 'conversation.message.delta' && data.type === 'answer') {
      writeEvent('delta', {
        content: data.content || '',
        conversationId: data.conversation_id,
        chatId: data.chat_id,
        messageId: data.id,
      })
      return
    }

    if (eventName === 'conversation.message.completed' && data.type === 'follow_up') {
      writeEvent('follow_up', { content: data.content || '' })
      return
    }

    if (eventName === 'conversation.chat.failed') {
      const msg = data?.last_error?.msg || data?.msg || '对话失败'
      writeEvent('error', { message: msg, detail: data })
      return
    }

    if (eventName === 'error') {
      writeEvent('error', {
        message: data?.msg || data?.message || '扣子返回错误',
        detail: data,
      })
    }
  }

  try {
    while (!closed) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split(/\n\n/)
      buffer = parts.pop() || ''
      for (const part of parts) {
        if (part.trim()) handleSseBlock(part)
      }
    }
    if (buffer.trim()) handleSseBlock(buffer)
  } catch (err) {
    if (!closed) {
      writeEvent('error', { message: err.message || '读取流失败' })
    }
  }

  writeEvent('done', {})
  res.end()
})

app.listen(PORT, () => {
  console.log(`[agent-proxy] http://127.0.0.1:${PORT}`)
  console.log(
    `[agent-proxy] bot_id=${COZE_BOT_ID || '(missing)'} pat=${COZE_PAT ? 'set' : 'MISSING'}`,
  )
})
