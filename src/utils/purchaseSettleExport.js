/**
 * 采购对账单导出 / 打印给供应商
 */
import { formatNumber } from '@/utils/numberFormat'
import { getLineEffectiveAmount } from '@/utils/purchaseSettleDispute'

function money(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return formatNumber(v, 2)
}

function sourceLabel(line) {
  if (line?.sourceType === 'fee' || line?.sourceType === 'adjust') {
    return line.feeType || '费用补差'
  }
  if (line?.sourceType === 'return' || line?.returnOrderId) return '退货'
  if (line?.sourceType === 'purchase') return '采购'
  return '入库'
}

export function buildPurchaseSettleExportRows(settle) {
  if (!settle) return []
  return (settle.lineItems || []).map((l, i) => ({
    index: i + 1,
    source: sourceLabel(l),
    sourceDocNo: l.inboundDocNo || l.returnOrderNo || l.purchaseOrderNo || '',
    purchaseOrderNo: l.purchaseOrderNo || settle.purchaseOrderNo || '',
    itemCode: l.itemCode || '',
    itemName: l.itemName || '',
    settleQty: l.settleQty ?? '',
    settleUnit: l.settleUnit || '',
    unitPrice: money(l.unitPrice),
    amount: money(l.amount),
    lineConfirm: money(getLineEffectiveAmount(l)),
    remark: l.remark || l.disputeRemark || '',
  }))
}

export function exportPurchaseSettleCsv(settle) {
  if (!settle) return { ok: false, message: '对账单不存在' }
  const rows = buildPurchaseSettleExportRows(settle)
  const headers = [
    '序号',
    '来源',
    '来源单号',
    '采购单号',
    '物料编码',
    '物料名称',
    '结算数量',
    '单位',
    '单价',
    '金额',
    '行确认额',
    '备注',
  ]
  const lines = [
    `对账单号,${settle.settleNo || ''}`,
    `供应商,${settle.supplier || ''}`,
    `账期,${settle.periodKey || ''}`,
    `对账日期,${settle.settleDate || ''}`,
    `账面金额,${money(settle.bookAmount ?? settle.totalAmount)}`,
    `确认金额,${money(settle.confirmedAmount ?? settle.bookAmount)}`,
    '',
    headers.join(','),
    ...rows.map((r) =>
      [
        r.index,
        r.source,
        r.sourceDocNo,
        r.purchaseOrderNo,
        r.itemCode,
        `"${String(r.itemName).replace(/"/g, '""')}"`,
        r.settleQty,
        r.settleUnit,
        r.unitPrice,
        r.amount,
        r.lineConfirm,
        `"${String(r.remark).replace(/"/g, '""')}"`,
      ].join(','),
    ),
  ]
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `采购对账_${settle.settleNo || settle.id || 'export'}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return { ok: true, message: '已导出' }
}

export function printPurchaseSettle(settle) {
  if (!settle) return { ok: false, message: '对账单不存在' }
  const rows = buildPurchaseSettleExportRows(settle)
  const trs = rows
    .map(
      (r) => `<tr>
      <td>${r.index}</td>
      <td>${r.source}</td>
      <td>${r.sourceDocNo || '—'}</td>
      <td>${r.purchaseOrderNo || '—'}</td>
      <td>${r.itemCode} ${r.itemName}</td>
      <td style="text-align:right">${r.settleQty}${r.settleUnit ? ' ' + r.settleUnit : ''}</td>
      <td style="text-align:right">${r.unitPrice}</td>
      <td style="text-align:right">${r.amount}</td>
      <td style="text-align:right">${r.lineConfirm}</td>
    </tr>`,
    )
    .join('')
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <title>采购对账单 ${settle.settleNo || ''}</title>
    <style>
      body{font-family:sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 12px}
      .meta{font-size:13px;margin-bottom:16px;line-height:1.7}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px 8px}
      th{background:#f5f5f5;text-align:left}
      .sum{margin-top:12px;font-size:13px}
      @media print{button{display:none}}
    </style></head><body>
    <h1>采购对账单 ${settle.settleNo || ''}</h1>
    <div class="meta">
      供应商：${settle.supplier || '—'}&nbsp;&nbsp;账期：${settle.periodKey || '—'}&nbsp;&nbsp;对账日期：${settle.settleDate || '—'}<br/>
      账面金额：¥ ${money(settle.bookAmount ?? settle.totalAmount)}&nbsp;&nbsp;
      确认金额：¥ ${money(settle.confirmedAmount ?? settle.bookAmount)}&nbsp;&nbsp;
      状态：${settle.status || '—'}
    </div>
    <table>
      <thead><tr>
        <th>序号</th><th>来源</th><th>来源单号</th><th>采购单</th><th>物料</th>
        <th>数量</th><th>单价</th><th>金额</th><th>行确认额</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>
    <div class="sum">（供供应商核对）打印时间：${new Date().toLocaleString()}</div>
    ` +
    '<scr' +
    'ipt>window.onload=function(){window.print()}</scr' +
    'ipt></body></html>'
  const w = window.open('', '_blank')
  if (!w) return { ok: false, message: '浏览器拦截了打印窗口，请允许弹窗后重试' }
  w.document.write(html)
  w.document.close()
  return { ok: true, message: '已打开打印' }
}
