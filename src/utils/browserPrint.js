/**
 * 在独立 iframe 中打印，避免 Safari 切换打印机时主页面布局被清空。
 */
import '@/styles/ecn-print-sheet.css'

const PRINT_STYLE_MARKERS = [
  'print-sheet',
  'ecn-print-preview',
  'ecn-print-sheet',
  'work-order-print-preview',
  'bom-print-preview',
  'preview-sheet',
  'sheet-page-break',
  'sheet-table',
  'no-print',
]

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

.print-iframe-body,
.ecn-print-iframe-body {
  margin: 0;
  padding: 0;
  background: #fff;
}

.print-iframe-body .preview-sheet,
.print-iframe-body .print-sheet,
.ecn-print-iframe-body .preview-sheet,
.ecn-print-iframe-body .print-sheet {
  box-sizing: border-box;
  width: 100%;
  padding: 10mm 8mm;
  box-shadow: none;
  background: #fff;
  color: #262626;
}

.print-iframe-body .sheet-page-break,
.ecn-print-iframe-body .sheet-page-break {
  page-break-before: always;
  margin-top: 0;
}

.print-iframe-body .preview-canvas,
.ecn-print-iframe-body .preview-canvas {
  padding: 0;
  display: block;
}

@media print {
  @page {
    size: auto;
    margin: 10mm;
  }
}
`

function matchesPrintStyle(text) {
  return PRINT_STYLE_MARKERS.some((marker) => text.includes(marker))
}

function buildPageStyles(paper = 'A4', orientation = 'portrait') {
  const landscape = orientation === 'landscape'
  const size =
    paper === 'A3'
      ? landscape
        ? 'A3 landscape'
        : 'A3 portrait'
      : landscape
        ? 'A4 landscape'
        : 'A4 portrait'
  return `
@media print {
  @page {
    size: ${size};
    margin: 10mm;
  }
}
`
}

function collectStyleText() {
  let css = BASE_PRINT_CSS
  document.querySelectorAll('style').forEach((tag) => {
    const text = tag.textContent || ''
    if (matchesPrintStyle(text)) {
      css += `\n${text}`
    }
  })

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules || []).forEach((rule) => {
        const text = rule.cssText || ''
        if (matchesPrintStyle(text)) {
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
 * @param {HTMLElement} element 要打印的 DOM 节点
 * @param {{ title?: string, styles?: string, paper?: string, orientation?: string }} options
 */
export function printElement(element, { title = 'Print', styles = '', paper, orientation } = {}) {
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

  const pageStyles = paper || orientation ? buildPageStyles(paper, orientation) : ''
  const mergedStyles = `${collectStyleText()}\n${pageStyles}\n${styles}`
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
<body class="print-iframe-body">
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
