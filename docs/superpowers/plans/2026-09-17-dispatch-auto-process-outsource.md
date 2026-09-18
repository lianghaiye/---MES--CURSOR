# 工单下发自动生成工序外协单 · Implementation Plan

> **For agentic workers:** Inline execution in this session.

**Goal:** 下发成功后按工序自动/确认生成工序外协单；外协工序免执行人、免小程序任务。

**Architecture:** 出单逻辑集中在 `workOrderProcessOutsource.js`；下发 helpers / 排产批次跳过外协执行人校验；`WorkOrderDispatchTab` 增加「下发前确认」勾选；生产/总装在下发成功后调用 `ensureProcessOutsourceOrdersAfterDispatch`。

**Tech Stack:** Vue3 + Ant Design Vue Modal.confirm + 现有 outsourcingOrderStore

## Global Constraints

- 一工序一单；数量=本批 `batchQty`；一批再下发再出新单
- 供应商可空；状态待提交
- 勾选「下发前确认」则串行确认；否=跳过本工序

---

### Task 1: 出单核心 API

**Files:** Modify `src/utils/workOrderProcessOutsource.js`

- [x] `resolveProcessOpOutsource` 合并主数据 `operations.opOutsource`
- [x] `createProcessOutsourceOrderFromDispatch({ workOrder, process, batchQty })`
- [x] `ensureProcessOutsourceOrdersAfterDispatch({ workOrder, batchQty })`（含串行确认）

### Task 2: 下发校验与小程序过滤

**Files:**

- Modify `src/utils/workOrderDispatchHelpers.js`
- Modify `src/utils/workOrderScheduleBatch.js`
- Modify `src/utils/mobileTaskDispatch.js`

- [x] 执行人校验跳过外协工序
- [x] 排产批次执行人校验跳过外协工序
- [x] 小程序任务不生成外协工序

### Task 3: UI + 接线

**Files:**

- Modify `WorkOrderDispatchTab.vue`
- Modify `WorkOrderManagementView.vue` / `AssemblyWorkOrderManagementView.vue`

- [x] 工序配置列「外协」后 Checkbox
- [x] 下发并开始 / 排产批次下发后调用 ensure
