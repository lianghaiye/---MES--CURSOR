# 销售明细发货信息列 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 销售明细列表增加「发货信息」摘要列与抽屉，调整合同编号/区域列顺序，导出同步。

**Architecture:** 新建 `salesLineShipInfo.js` 按行聚合发货申请；新建 `SalesLineShipDrawer.vue` 对齐 SN 抽屉；在 `SalesOrderLineListView` 升版列设置并挂交互；展平行补 `region`，导出字段对齐。

**Tech Stack:** Vue 3 + Ant Design Vue（i-doms-web）

## Global Constraints

- 摘要：`已发货 n`；n=0 为 `—` 且不可点
- 交货方式取发货单 `shipmentMethod`
- 关联：`lineItems` / `scatterShipments` 的 `id` 或 `salesLineId` 匹配 `lineId`
- 数据源优先：`order.deliveryApplications`
- 列设置 key 升为 `sales-order-line-list-v4`
- 本期不新增筛选；抽屉明细字段不导出
- 仓库无单测脚本：用页面手工验收

---

### Task 1: salesLineShipInfo 工具

**Files:**

- Create: `src/utils/salesLineShipInfo.js`
- Modify: `src/utils/salesOrderLineList.js`（`region` + merge keys）

**Interfaces:**

- Produces:
  - `formatShipSummaryText(total: number): string`
  - `listDeliveriesForLine(order, lineId): object[]`
  - `summarizeLineShipInfo(order, lineId): { total, summaryText, deliveries }`

- [ ] **Step 1: 实现 util**

```js
function lineIdMatches(row, lineId) {
  return row?.id === lineId || row?.salesLineId === lineId
}

export function formatShipSummaryText(total = 0) {
  const n = Number(total) || 0
  if (n <= 0) return '—'
  return `已发货 ${n}`
}

export function listDeliveriesForLine(order, lineId) {
  if (!order || !lineId) return []
  const seen = new Set()
  const matched = []
  for (const app of order.deliveryApplications || []) {
    const id = app?.id
    if (!id || seen.has(id)) continue
    const hit =
      (app.lineItems || []).some((li) => lineIdMatches(li, lineId)) ||
      (app.scatterShipments || []).some((sh) => lineIdMatches(sh, lineId))
    if (!hit) continue
    seen.add(id)
    matched.push(app)
  }
  matched.sort((a, b) => {
    const ta = String(a.deliveryDate || a.createdAt || '')
    const tb = String(b.deliveryDate || b.createdAt || '')
    return tb.localeCompare(ta)
  })
  return matched
}

export function summarizeLineShipInfo(order, lineId) {
  const deliveries = listDeliveriesForLine(order, lineId)
  return {
    total: deliveries.length,
    summaryText: formatShipSummaryText(deliveries.length),
    deliveries,
  }
}
```

- [ ] **Step 2: flatten 增加 region；merge keys 含 region**

`flattenSalesOrderLines` 增加 `region: order.region || ''`。  
`SALES_LINE_ORDER_MERGE_KEYS` 增加 `'region'`。

- [ ] **Step 3: Commit**

```bash
git add src/utils/salesLineShipInfo.js src/utils/salesOrderLineList.js
git commit -m "feat: 销售明细行聚合发货信息摘要"
```

---

### Task 2: SalesLineShipDrawer

**Files:**

- Create: `src/views/sales/components/SalesLineShipDrawer.vue`

**Interfaces:**

- Consumes: `listDeliveriesForLine`；props `open`, `lineRow`（含 `orderId`/`lineId`/`orderNo`/`customerName`/`productName`）
- Produces: 抽屉 UI；发货单号跳转 `sales-delivery-detail`

- [ ] **Step 1: 实现抽屉**（结构对齐 `SalesLineSnDrawer.vue`）

- 标题：`发货信息 · {productName}`
- 副标题：销售单号 · 客户
- 表列：发货单号、交货方式、物流单号、交货地址、出库仓库、司机姓名、司机联系方式、车牌号
- 通过 `salesOrderState.orders` 找 order，再 `listDeliveriesForLine`
- 发货单号：`openTab` + `router.push({ name: 'sales-delivery-detail', params: { id: record.id } })`（路径 `/sales/delivery/${id}`）
- 页脚：关闭 + 打开销售订单（`?tab` 不强制 industrial-label，用默认或发货相关即可，对齐打开订单详情）

- [ ] **Step 2: Commit**

```bash
git add src/views/sales/components/SalesLineShipDrawer.vue
git commit -m "feat: 销售明细发货信息抽屉"
```

---

### Task 3: 列表列顺序 + 交互 + 导出

**Files:**

- Modify: `src/views/sales/SalesOrderLineListView.vue`
- Modify: `src/utils/exportFields/salesOrderLineExport.js`

- [ ] **Step 1: baseColumns 调整**

- `salesQty` 后插入 `contractNo`
- `deliveryMode` 后插入 `{ title: '发货信息', key: 'shipInfo', width: 110 }`
- 删除原位 `contractNo`；`salesperson` 后插入 `region`
- `useTableColumnSettings('sales-order-line-list-v4', ...)`；`minScrollX` 酌增（如 +200）

- [ ] **Step 2: enrich + 单元格 + 抽屉**

```js
function enrichRowShipInfo(row) {
  const order = salesOrderState.orders.find((o) => o.id === row.orderId)
  const sum = summarizeLineShipInfo(order, row.lineId)
  return { ...row, shipTotal: sum.total, shipSummaryText: sum.summaryText }
}
// filteredRows: .map(enrichRowSnSummary).map(enrichRowShipInfo)
```

模板 `shipInfo`：`shipTotal` 为 0 显示 —；否则链接 `openShipDrawer(record)`。  
挂载 `<SalesLineShipDrawer v-model:open="shipDrawerOpen" :line-row="shipDrawerRow" />`。

- [ ] **Step 3: 导出字段**

- `salesQty` 后插入 `contractNo`
- `deliveryMode` 后插入 `shipSummaryText`（title: 发货信息）
- `salesperson` 后插入 `region`；删除原位 `contractNo`

- [ ] **Step 4: 手工验收**（规格 §8）后 Commit

```bash
git add src/views/sales/SalesOrderLineListView.vue src/utils/exportFields/salesOrderLineExport.js
git commit -m "feat: 销售明细发货信息列与合同编号/区域列顺序"
```

- [ ] **Step 5: 更新 design 状态为已确认**

`docs/superpowers/specs/2026-09-18-sales-line-ship-info-design.md` 状态改为已确认并实现。

---

## Spec coverage

| Spec                     | Task             |
| ------------------------ | ---------------- |
| 发货摘要 / 关联口径      | T1               |
| 抽屉字段与跳转           | T2               |
| 列顺序、交互、导出、区域 | T3               |
| 列设置升版               | T3               |
| 不筛选 / 不导出明细      | 遵守、未加筛选项 |

## Execution

本会话采用 **Inline Execution** 直接按 Task 1→3 实现。
