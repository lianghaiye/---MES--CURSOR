# 库存扣减记录编辑改为标签页

## 目标

将「编辑待确认扣减」从弹窗改为独立标签页，交互与盘点/调拨编辑一致。

## 方案

1. 路由：`/inventory/deduct-records/:id/edit`（置于详情 `:id` 之前）
2. 页面：`InventoryDeductEditView` 挂载表单组件（`pageMode`）
3. 表单：`InventoryDeductEditModal` 接入 `FormCreateShell` + `useFormCreateModal`；保存/取消后关闭标签并回列表
4. 入口：列表与详情「编辑」均 `openCreateTab`，去掉弹窗挂载

## 范围外

- 不改确认/作废/撤销等其它操作
- 不新增「新建扣减单」能力
