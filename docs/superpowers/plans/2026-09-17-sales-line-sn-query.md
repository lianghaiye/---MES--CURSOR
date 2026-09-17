# 销售明细 SN 查单 + 移动 H5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 销售明细支持按工业 SN（精确/模糊）查销售行并展示摘要抽屉；同期交付移动 H5 `/m/sn-lookup` 扫/输 SN 精确查单。

**Architecture:** 公共纯函数 `salesSnLookup.js` 基于 `industrialLabelState` 做匹配与行摘要；PC 列表过滤用 `lineId` 对齐 `salesLineId`；H5 独立 standalone 路由复用同一 lookup，扫码优先 `BarcodeDetector`，失败则手输。

**Tech Stack:** Vue3 + Ant Design Vue + vue-router（`meta.standalone`）+ 现有 `industrialLabelStore` / `salesOrderStore`

**Spec:** `docs/superpowers/specs/2026-09-17-sales-line-sn-query-design.md`

## Global Constraints

- 列表保持销售行粒度，不按 SN 拆行
- 匹配键：`label.salesLineId` ↔ 明细行 `lineId`（不是展平后的 `row.id`）
- 作废 SN（`LABEL_STATUS.VOID`）不参与检索与摘要计数
- 模糊匹配有效长度 &lt; 4 不查；移动端仅精确
- 一期只读；不引入第三方扫码 npm 包；本仓无单元测试 runner，用 eslint + 浏览器冒烟

---

### Task 1: 公共 SN 查询工具

**Files:**

- Create: `src/utils/salesSnLookup.js`

**Interfaces:**

- Produces:
  - `normalizeSnCode(input: string): string`
  - `isLabelQueryable(label): boolean` — 非作废且有 `salesLineId`
  - `matchLabelsBySn(code, { fuzzy?: boolean }): object[]`
  - `summarizeLineLabels(salesLineId, labels?): { total, mounted, summaryText }`
  - `lookupSalesBySn(code, { fuzzy?: boolean }): { ok, message, matchedLabels, salesLineIds }`
  - `formatSnSummaryText({ total, mounted }): string` — `—` / `已申请 n` / `已刻录 a/n`

- [ ] **Step 1: 实现 `src/utils/salesSnLookup.js`**

```js
import { industrialLabelState, LABEL_STATUS } from '@/store/industrialLabelStore'

export function normalizeSnCode(input) {
  return String(input || '').trim()
}

export function isLabelQueryable(label) {
  if (!label) return false
  if (label.status === LABEL_STATUS.VOID) return false
  return Boolean(String(label.salesLineId || '').trim())
}

export function formatSnSummaryText({ total = 0, mounted = 0 } = {}) {
  const n = Number(total) || 0
  if (n <= 0) return '—'
  const a = Number(mounted) || 0
  if (a > 0) return `已刻录 ${a}/${n}`
  return `已申请 ${n}`
}

export function matchLabelsBySn(code, { fuzzy = false } = {}) {
  const raw = normalizeSnCode(code)
  if (!raw) return []
  const needle = raw.toLowerCase()
  return (industrialLabelState.labels || []).filter((l) => {
    if (!isLabelQueryable(l)) return false
    const hay = String(l.labelCode || '').toLowerCase()
    return fuzzy ? hay.includes(needle) : hay === needle
  })
}

export function summarizeLineLabels(salesLineId, labels) {
  const list = (labels || industrialLabelState.labels || []).filter(
    (l) => isLabelQueryable(l) && l.salesLineId === salesLineId,
  )
  const mounted = list.filter((l) => l.nameplateMountedAt || l.engraveStatus === '已刻录').length
  const total = list.length
  return { total, mounted, summaryText: formatSnSummaryText({ total, mounted }) }
}

export function lookupSalesBySn(code, { fuzzy = false } = {}) {
  const raw = normalizeSnCode(code)
  if (!raw) return { ok: false, message: '请输入 SN 码', matchedLabels: [], salesLineIds: [] }
  if (fuzzy && raw.replace(/\s/g, '').length < 4) {
    return { ok: false, message: '至少输入 4 位', matchedLabels: [], salesLineIds: [] }
  }
  const matchedLabels = matchLabelsBySn(raw, { fuzzy })
  if (!matchedLabels.length) {
    // 精确时区分作废
    if (!fuzzy) {
      const any = (industrialLabelState.labels || []).find(
        (l) => String(l.labelCode || '').toLowerCase() === raw.toLowerCase(),
      )
      if (any?.status === LABEL_STATUS.VOID) {
        return { ok: false, message: '标识已作废', matchedLabels: [], salesLineIds: [] }
      }
    }
    return { ok: false, message: '未找到匹配 SN', matchedLabels: [], salesLineIds: [] }
  }
  const salesLineIds = [...new Set(matchedLabels.map((l) => l.salesLineId).filter(Boolean))]
  return { ok: true, message: '', matchedLabels, salesLineIds }
}
```

- [ ] **Step 2: eslint 该文件**

Run: `npx eslint src/utils/salesSnLookup.js`  
Expected: 无 error

- [ ] **Step 3: Commit**

```bash
git add src/utils/salesSnLookup.js
git commit -m "feat: 抽取工业 SN 查销售行公共 lookup"
```

---

### Task 2: 销售明细过滤 / 摘要接入

**Files:**

- Modify: `src/utils/salesOrderLineList.js`
- Modify: `src/utils/exportFields/salesOrderLineExport.js`

**Interfaces:**

- Consumes: `lookupSalesBySn`, `summarizeLineLabels`, `formatSnSummaryText`
- Produces: `filterSalesOrderLines` 支持 `snCode` / `snFuzzy` / `snMatchedLineIds`；行可带 `snSummaryText`（由 View enrich）

- [ ] **Step 1: 扩展 `filterSalesOrderLines`**

在现有 filter 末尾、`return true` 前增加：

```js
if (f.snMatchedLineIds instanceof Set) {
  if (!f.snMatchedLineIds.has(row.lineId)) return false
} else if (f.snCode) {
  // 兜底：若调用方未预计算 Set，则拒绝（由 View 负责 lookup）
  return false
}
```

说明：SN 命中集合由 View 调用 `lookupSalesBySn` 得到 `salesLineIds` 后传入 `snMatchedLineIds: new Set(...)`，避免在 filter 内重复扫 labels。若 `snCode` 有值但 lookup 失败，View 应直接清空列表并提示，不必走进 filter。

- [ ] **Step 2: 导出字段增加工业 SN 摘要**

在 `salesOrderLineExport.js` 的 `productCode` 后插入：

```js
{
  key: 'snSummaryText',
  title: '工业 SN 摘要',
  getValue: (row) => cell(row, 'snSummaryText'),
},
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/salesOrderLineList.js src/utils/exportFields/salesOrderLineExport.js
git commit -m "feat: 销售明细过滤与导出支持工业 SN"
```

---

### Task 3: 销售明细 UI（筛选 + 列 + 抽屉）

**Files:**

- Modify: `src/views/sales/SalesOrderLineListView.vue`
- Create: `src/views/sales/components/SalesLineSnDrawer.vue`

- [ ] **Step 1: 筛选区**

在 `filters` 增加 `snCode: ''`、`snFuzzy: false`；表单项「SN 码」+ Checkbox「模糊匹配」；旁链打开 `/m/sn-lookup`（`window.open` 或 `router.resolve` + `_blank`，query 带当前 sn）。

搜索逻辑：

```js
let snMatchedLineIds = null
if (filters.snCode?.trim()) {
  const res = lookupSalesBySn(filters.snCode, { fuzzy: filters.snFuzzy })
  if (!res.ok) {
    message.warning(res.message)
    snMatchedLineIds = new Set() // 空命中
  } else {
    snMatchedLineIds = new Set(res.salesLineIds)
  }
}
appliedFilters.value = { ...filters, snMatchedLineIds }
```

`filteredRows` 用 `appliedFilters`；有 SN 条件且空 Set → 空列表。

- [ ] **Step 2: 行 enrich 摘要**

在构建展示行时（或 computed map）对每行：

```js
const sum = summarizeLineLabels(row.lineId)
return { ...row, snTotal: sum.total, snMounted: sum.mounted, snSummaryText: sum.summaryText }
```

- [ ] **Step 3: 列「工业 SN」**

`baseColumns` 在 `productCode` 后插入 `{ title: '工业 SN', key: 'industrialSn', width: 130 }`。  
bodyCell：无摘要显示 `—`；有则 link 打开抽屉；若 `snMatchedLineIds?.has(record.lineId)` 显示 Tag「命中」。

- [ ] **Step 4: `SalesLineSnDrawer.vue`**

Props: `open`, `lineRow`, `highlightLabelCodes: string[]`  
列出该 `lineId` 的 labels；命中码置顶+高亮；底部按钮打开 `/sales/orders/:orderId` 并 `query: { tab: 'industrial-label' }`（若详情页已支持 tab query；否则先跳详情，能打开工业标识即可——检查 `SalesOrderDetailView` 的 `activeTab`，有则对接，无则仅打开详情）。

- [ ] **Step 5: 浏览器冒烟**

1. 打开销售明细，用种子里已知 SN（如工业标识演示单）精确搜 → 一行命中 + Tag
2. 模糊输 3 位 → 提示至少 4 位
3. 点摘要打开抽屉，跳订单

- [ ] **Step 6: Commit**

```bash
git add src/views/sales/SalesOrderLineListView.vue src/views/sales/components/SalesLineSnDrawer.vue
git commit -m "feat: 销售明细按工业 SN 筛选与抽屉明细"
```

---

### Task 4: 移动 H5 `/m/sn-lookup`

**Files:**

- Create: `src/views/mobile/SnLookupView.vue`
- Modify: `src/router/index.js`（standalone 路由，与打印预览同级）
- Modify: `src/config/menus.js` 的 `routeTitles`（可选，补标题）

- [ ] **Step 1: 注册路由**

```js
{
  path: '/m/sn-lookup',
  name: 'mobile-sn-lookup',
  component: () => import('@/views/mobile/SnLookupView.vue'),
  meta: { title: '扫 SN 查单', standalone: true },
},
```

放在 `MainLayout` 外、与其它 `standalone` 预览路由一起。

- [ ] **Step 2: 实现 `SnLookupView.vue`**

- 顶栏标题「扫 SN 查单」
- 扫码区：按钮「打开摄像头扫码」；`navigator.mediaDevices.getUserMedia` + 若存在 `window.BarcodeDetector` 则轮询检测 `qr_code`/`code_128` 等；失败 toast「请改用手输」
- 输入框 + 查询按钮：调用 `lookupSalesBySn(sn, { fuzzy: false })`
- 成功：用 `salesLineIds[0]` + `matchedLabels[0]`，从 `salesOrderState.orders` 找订单与行，渲染结果卡（单号、客户、产品、规格、行发货状态、SN 状态、装牌状态）
- 失败：展示 `message`
- `onMounted`：若 `route.query.sn` 则填入并自动查
- 「再扫一单」清空

结果卡打开订单（需登录）：`router.push({ name: 'sales-orders-detail', params: { id: orderId } })` — standalone 页在已登录会话下可用。

- [ ] **Step 3: 冒烟**

1. 桌面打开 `/m/sn-lookup?sn=已知完整码` → 结果卡
2. 手输作废/不存在码 → 对应文案
3. 销售明细「手机查单」链可打开

- [ ] **Step 4: Commit**

```bash
git add src/views/mobile/SnLookupView.vue src/router/index.js src/config/menus.js
git commit -m "feat: 移动 H5 扫/输工业 SN 查销售单"
```

---

### Task 5: 详情页签对接（若缺口）

**Files:**

- Modify: `src/views/sales/SalesOrderDetailView.vue`（仅当尚不支持 `?tab=industrial-label`）

- [ ] 若 `activeTab` 未读 route query：在 `onMounted`/`watch route` 支持 `tab=industrial-label` 定位工业标识页签
- [ ] Commit: `fix: 销售订单详情支持 tab=industrial-label 深链`

---

## Spec coverage

| Spec 项                       | Task    |
| ----------------------------- | ------- |
| PC 精确/模糊筛 SN             | 1–3     |
| 行摘要 + 命中 Tag + 抽屉      | 3       |
| 导出摘要                      | 2       |
| H5 `/m/sn-lookup` 扫/输精确查 | 4       |
| `?sn=` 预填                   | 4       |
| 打开销售订单工业标识          | 3 + 5   |
| 作废/未找到文案               | 1, 3, 4 |

## Self-review

- 无 TBD；匹配键明确为 `lineId`
- 移动不做模糊，与 spec §5.2 一致
- 不引入扫码 npm，符合 Global Constraints
