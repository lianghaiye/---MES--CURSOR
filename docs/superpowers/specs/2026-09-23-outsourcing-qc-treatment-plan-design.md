# 来料 / 外协回货检：数量处置（多数量桶）

**日期：** 2026-09-23  
**仓库：** i-doms-web  
**状态：** 已确认落地  
**范围：** 来料质检、外协回货检录入及详情/打印/生成入库

## 1. 两层语义（勿混）

| 层级         | 含义               | 规则来源                 |
| ------------ | ------------------ | ------------------------ |
| **整单结论** | 本行检验项是否达标 | 质检模板整单规则         |
| **数量处置** | 实物按数量拆分去向 | 业务处置，不属于模板指标 |

整单「不合格」仍可混合拆分数量（部分入库、部分退换/返工报废）。

## 2. 多数量桶（来料与外协统一交互）

两者均**不再手选单一处理方案**；`treatmentPlan` 由数量自动汇总。

| 字段               | 来料文案 | 外协文案       |
| ------------------ | -------- | -------------- |
| `acceptInboundQty` | 合格入库 | 合格入库       |
| `concessionQty`    | 让步入库 | 让步入库       |
| `returnQty`        | 退货     | 返工           |
| `exchangeQty`      | 换货     | 报废（含料废） |

约束：四桶之和 ≤ 质检数量。  
可入库（生成入库）：`acceptInboundQty + concessionQty`。

## 3. 默认预填

| 结论       | 默认                              |
| ---------- | --------------------------------- |
| 不合格     | 全量 → 退货（来料）/ 返工（外协） |
| 含「让步」 | 全量 → 让步入库                   |
| 部分合格   | 不预填，由用户拆分                |

## 4. 验收

1. 来料 / 外协录入均无单选处理方案，四个数量桶可见。
2. 可录入混合处置，方案汇总自动生成。
3. 生成入库数量 = 合格 + 让步。
4. 详情 / 打印展示合格/让步与次要处置列。

## 5. 涉及文件

- `src/utils/qcTreatmentPlan.js`
- `src/utils/qcInboundFromReceipt.js`
- `src/utils/qcTaskPrintPreview.js`
- `src/views/quality/QcTaskInspectView.vue`
- `src/views/quality/QcTaskDetailView.vue`
- `src/views/quality/QcTaskPrintPreviewView.vue`
- `src/store/qcTaskStore.js`
