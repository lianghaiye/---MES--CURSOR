# 采购结算规则配置（前端 mock）

日期：2026-09-17

## 目标

支持配置结算规则，在指定时刻自动结算指定时间段内的采购数据。

## 已拍板

- 结算对象：规则可选「按入库」或「按采购单（已完成）」
- 执行结果：规则可选「生成草稿」或「自动确认」
- 本版范围：仅前端（规则页 + 立即试跑 + 浏览器内模拟定时）

## 入口

采购管理 → 结算规则（`/procurement/purchase-settle-rules`）

## 规则字段

| 字段                           | 说明                                         |
| ------------------------------ | -------------------------------------------- |
| settleTarget                   | inbound / purchase_order                     |
| resultMode                     | draft / auto_confirm                         |
| executeFreq                    | daily / weekly / monthly + executeTime       |
| scanWindowType                 | last_month / last_week / last_n_days / fixed |
| supplierIds / settlementCycles | 可选过滤                                     |

## 执行

- 按入库：`previewSettlesByFixedWindow` → `createSettlesFromPeriod`
- 按采购单：完成日落入扫描窗且仍有可结算入库 → `createSettleFromPurchaseOrder`
- 幂等：同规则同扫描窗 periodKey 已存在则跳过
- 调度：`purchaseSettleRuleScheduler`（setTimeout，每小时重算）

## 不做

真实后端 cron、应付对接、外协结算。
