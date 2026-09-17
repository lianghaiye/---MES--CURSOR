# 库存调拨与盘点 Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax. This repo has **no unit test runner for stores**; verify with eslint and manual UI smoke.

**Goal:** 在库存管理下交付独立「调拨管理」「盘点管理」（仅表格），确认时编排生成调拨/盘点出入库单并入账。

**Architecture:** 主单 store 管状态机；`utils/transferConfirm.js` / `utils/stocktakeConfirm.js` 编排创建并 `confirmOutbound` / `confirmInboundOrders`；不改软占用。

**Tech Stack:** Vue3 + Ant Design Vue + 现有 mock store（outboundStore / inboundOrderStore / stock\*）

**Spec:** `docs/superpowers/specs/2026-09-17-inventory-transfer-stocktake-design.md`

## Global Constraints

- 列表仅表格，无卡片视图
- 状态：待确认 / 部分确认 / 已确认 / 已拒绝
- 联动出入库 `sourceChannel=business`，主单号写入 `sourceOrderNo`
- 按单批次调拨保留销售归属；软占用不动
- 一期不做打印、盲盘、整仓全盘、释放软占用

---

### Task 1: Options + Mock 模型

**Files:**

- Create: `src/mock/transferOptions.js`
- Create: `src/mock/transferOrders.js`
- Create: `src/mock/stocktakeOptions.js`
- Create: `src/mock/stocktakeOrders.js`

- [ ] 导出状态选项、颜色、来源标签、`createTransferOrder/Line`、`createStocktakeOrder/Line`、空种子数组（种子在 Task 6 注入）

---

### Task 2: 调拨 Store + 确认编排

**Files:**

- Create: `src/utils/transferConfirm.js`
- Create: `src/store/transferOrderStore.js`

- [ ] CRUD、`canEdit/Delete/Confirm/Refuse`、`recomputeTransferOrderStatus`
- [ ] `confirmTransfer` / `confirmTransferLine` / `refuseTransfer` / `refuseTransferLine`
- [ ] 确认时生成调拨出库+调拨入库并入账；主单写 `linkedOutboundIds` / `linkedInboundIds`

---

### Task 3: 盘点 Store + 确认编排

**Files:**

- Create: `src/utils/stocktakeConfirm.js`
- Create: `src/store/stocktakeOrderStore.js`

- [ ] 同构 CRUD 与状态机
- [ ] 确认按差异生成盘点入库或盘点出库；无差异仅改行状态

---

### Task 4: 菜单 / 路由 / createPages

**Files:**

- Modify: `src/config/menus.js`
- Modify: `src/config/createPages.js`
- Modify: `src/router/index.js`

- [ ] 入库管理后插入调拨、盘点；路由 list/new/edit/detail

---

### Task 5: 调拨 UI

**Files:**

- Create: `src/views/inventory/TransferManagementView.vue`
- Create: `src/views/inventory/TransferOrderCreateView.vue`
- Create: `src/views/inventory/TransferOrderEditView.vue`
- Create: `src/views/inventory/TransferOrderDetailView.vue`
- Create: `src/views/inventory/components/TransferOrderFormModal.vue`

- [ ] 表格列表 + 筛选 + 确认/拒绝/编辑/删除
- [ ] 表单：双仓、明细选库存、数量；详情展示联动单号

---

### Task 6: 盘点 UI + 种子

**Files:**

- Create: 同构 `Stocktake*` views / FormModal
- Modify: 合适 seed 入口（如 `crossModuleDemoSeed` 或独立 seed 在 store 初始化）

- [ ] 表格列表与表单（选仓、勾选库存行、实盘数量）
- [ ] 注入 1～2 条演示调拨/盘点单（可选）

---

### Task 7: 验收

- [ ] eslint 关键文件
- [ ] 手工：新建调拨确认后出入库与库存变化；盘点盘盈/盘亏联动单
