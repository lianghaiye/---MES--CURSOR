/**
 * 在独立 iframe 中打印，避免 Safari 切换打印机时主页面布局被清空。
 */
import '@/styles/ecn-print-sheet.css'

const BASE_PRINT_CSS = `
html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #262626;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif;
}

* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@media print {
  @page {
    size: auto;
    margin: 10mm;
  }
}
`

function collectStyleText() {
  let css = BASE_PRINT_CSS
  document.querySelectorAll('style').forEach((tag) => {
    const text = tag.textContent || ''
    if (
      text.includes('print-sheet') ||
      text.includes('ecn-print-preview') ||
      text.includes('ecn-print-sheet')
    ) {
      css += `\n${text}`
    }
  })

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules || []).forEach((rule) => {
        const text = rule.cssText || ''
        if (
          text.includes('print-sheet') ||
          text.includes('ecn-print-preview') ||
          text.includes('ecn-print-sheet')
        ) {
          css += `\n${text}`
        }
      })
    } catch {
      // 跨域样式表不可读，忽略
    }
  })

  return css
}

/**
 * 在独立 iframe 中打印，避免 Safari 切换打印机时主页面布局被清空。
 */
export function printElement(element, { title = 'Print', styles = '' } = {}) {
  if (!element) return

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }

  const mergedStyles = `${collectStyleText()}\n${styles}`
  const safeTitle = String(title).replace(/[<>&"]/g, '')

  doc.open()
  doc.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>${mergedStyles}</style>
</head>
<body class="ecn-print-iframe-body">
${element.outerHTML}
</body>
</html>`)
  doc.close()

  const win = iframe.contentWindow
  if (!win) {
    iframe.remove()
    return
  }

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove()
    }, 500)
  }

  const triggerPrint = () => {
    win.focus()
    win.print()
    win.addEventListener('afterprint', cleanup, { once: true })
    window.setTimeout(cleanup, 120000)
  }

  window.setTimeout(triggerPrint, 300)
}
