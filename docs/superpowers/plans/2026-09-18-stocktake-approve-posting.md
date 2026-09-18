# 盘点审核与过账 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 盘点单改为待审核/审核通过/已拒绝/已过账；可配置自动或手动过账；失败可重试；表单含盘点类型与加载本仓库存；详情关联单据 Tab。

**Architecture:** `stocktakeOptions` 状态与类型；`stocktakeSettingsStore` 全局自动过账开关；`stocktakeOrderStore` 审核/过账 API；`stocktakeConfirm.js` 先校验后生成出入库；UI 列表/表单/详情对齐。

**Tech Stack:** Vue3、Ant Design Vue、现有 inbound/outbound store。

**Spec:** `docs/superpowers/specs/2026-09-18-stocktake-approve-posting-design.md`

---

### Task 1: Options + Settings + Seed status migrate

**Files:**

- Modify: `src/mock/stocktakeOptions.js`
- Create: `src/store/stocktakeSettingsStore.js`
- Modify: `src/mock/stocktakeOrders.js`
- Modify: `src/store/stocktakeOrderStore.js`（seed version bump + migrate）

- [ ] 状态枚举改为待审核/审核通过/已拒绝/已过账；颜色；盘点类型常量
- [ ] postingStatus 辅助文案
- [ ] settingsStore：autoPostOnApprove 默认 true
- [ ] 种子单据改用新状态；seed v+1

### Task 2: Confirm/Post pipeline

**Files:**

- Modify: `src/utils/stocktakeConfirm.js`
- Modify: `src/store/stocktakeOrderStore.js`

- [ ] `validateStocktakePosting(order)` 全量校验
- [ ] `postStocktakeOrder(order, { force, operator })` 成功后写关联单号、已过账
- [ ] `approveStocktake` / `refuseStocktake` / `retryPostStocktake`
- [ ] canEdit / canApprove / canPost helpers

### Task 3: Form UI

**Files:**

- Modify: `src/views/inventory/components/StocktakeOrderFormModal.vue`

- [ ] 盘点类型字段；小标题盘点清单
- [ ] 加载本仓库存（自由+按单分行）
- [ ] 归属列；保存时带 stocktakeType

### Task 4: List + Detail

**Files:**

- Modify: `src/views/inventory/StocktakeManagementView.vue`
- Modify: `src/views/inventory/StocktakeOrderDetailView.vue`

- [ ] 列表：审核/拒绝/生成盘盈盘亏；过账配置开关
- [ ] 详情：审核操作；关联单据 Tab；过账失败提示与重试

### Task 5: Verify

- [ ] eslint 关键文件
- [ ] 手工路径：待审核→通过（自动过账）→已过账；手动模式点生成；失败重试
