# 工序作业分项 · 报工口径与计薪口径设计

**日期：** 2026-09-22  
**仓库：** i-doms-web  
**状态：** 待评审  
**背景：** 客户存在「同一工序内多种作业内容、多人认领、按类型计价」场景（如钻孔：大孔/小孔/内角孔）。旧做法拆成多道工序不灵活；现网计件仅支持报工数量 × 单一单价。

## 1. 目标

在**不拆工序任务粒度**的前提下：

1. 支持工序级可配置的**报工口径**与**计薪口径**；
2. 支持工序**作业分项模板** + 产品侧**分项单价**；
3. 与现有极简模式（非时序、任务池领取）兼容；
4. 未启用分项的工序行为与现网完全一致。

## 2. 决策摘要

| 项                    | 选择                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------- |
| 任务粒度              | 仍为 `工单 × 工序` 一条；**不按分项、不按人**拆任务（协作时长报工按人拆条的现规则保留） |
| 多人协作              | 沿用 `claimTargets` 任务池；有空领取后报自己的分项                                      |
| 报工口径 / 计薪口径   | **两项独立配置**，挂在**工序主数据**                                                    |
| 分项模板              | 挂在**工序主数据**（code / name / unit，无价）                                          |
| 分项单价 / 可选计划量 | 挂在**产品/物料 laborRows**（按模板 code；计划量为**单件** `plannedQtyPerPiece`）       |
| 极简非时序            | 分项**不做**齐套门控，不拦截其它工序                                                    |
| 禁止组合              | `reportQtyMode=itemized` + `wageQtyMode=reported`（一期）                               |
| 分项计薪与报工类型    | `wageQtyMode=itemized` 一期仅配合批量计件；时长报工保持 `reported`                      |
| 快速报工              | 一期仅 `schedule + reported`；分项只开放任务报工                                        |

## 3. 配置与数据模型

### 3.1 工序主数据新增

```
process
  reportQtyMode: 'schedule' | 'itemized'   // 报工口径：按排产数量 | 按分项明细
  wageQtyMode:   'reported' | 'itemized'   // 计薪口径：按报工数 | 按分项明细
  workItemTemplates[]:
    - code: string
    - name: string
    - unit: string
```

**配置校验：**

- `reportQtyMode=itemized` 且 `wageQtyMode=reported` → 禁止保存；
- 任一口径为 `itemized` → `workItemTemplates` 至少 1 条；
- 两者均为非分项 → 可不配模板（现网默认）。

**默认值（迁移）：** 已有工序 `reportQtyMode=schedule`，`wageQtyMode=reported`，`workItemTemplates=[]`。

### 3.2 产品 laborRows 扩展

在现有「物品编码 × 工序名」工时行上增加：

```
laborRow
  // 保留：reportType / salaryMethod / pieceRate / standardHourlyRate / …
  workItemRates[]:
    - itemCode: string          // 对齐工序模板 code
    - unitPrice: number         // 分项单价
    - plannedQtyPerPiece?: number  // 可选：单件计划分项量；任务总计划 = 该值 × 本批/工单排产数
```

**合并规则：** 报工/下发需要分项时 = 工序 `workItemTemplates` 按 `itemCode` 左连本产品该工序 `workItemRates`。

**缺价策略：** 任一口径为 `itemized` 时，下发前对模板分项**拦截**缺价（须配齐 `unitPrice`）。

**与报工类型关系：** `wageQtyMode=itemized` 一期仅允许配合「批量计件」类报工；「时长报工」须保持 `wageQtyMode=reported`（走现有计时公式）。

### 3.3 报工记录扩展

```
processReport
  goodQty / defectQty              // schedule 口径下主数量；itemized 下可空或辅助
  workItems[]?:
    - itemCode / itemName / unit
    - qty: number
    - unitPriceSnapshot: number    // 提交时快照
  // 可选：分项行级 override 标记（审核改价）
```

### 3.4 任务快照（下发 enrichment）

小程序任务在现有字段外可选写入：

- `reportQtyMode`、`wageQtyMode`
- 合并后的分项清单：`code / name / unit / unitPrice / plannedQtyPerPiece`（以及按排产数算出的 `plannedQtyTotal`）

**在制任务以快照为准**，事后改工序主数据或 labor 单价不影响已下发任务的报工/计薪规则。

## 4. 下发改动点

| 环节                             | 行为                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| 任务条数 / ID                    | **不变**（`mt-{workOrderId}-{processSeq}`；协作时长例外按现规则） |
| 极简并行 / 领取 / 单人直达待报工 | **不变**                                                          |
| 下发前校验                       | 口径含 `itemized` 时校验本产品分项单价齐全                        |
| 按分项拆任务                     | **不做**                                                          |
| 排产批次                         | **不**因分项再生成任务                                            |

伪流程：

```
dispatch 工序
  → 读工序 reportQtyMode / wageQtyMode / workItemTemplates
  → 合并产品 workItemRates
  → itemized 且缺价 → fail
  → 生成 1 条 mobile task（带口径与分项快照）
```

涉及实现落点（参考现网）：`mobileTaskDispatch.js`、`workOrderDispatchHelpers.js`、工序配置表单、物料/产品 laborRows 表单。

## 5. 报工 / 计薪行为矩阵

| reportQtyMode | wageQtyMode | 报工 UI                      | 计薪取数                                          |
| ------------- | ----------- | ---------------------------- | ------------------------------------------------- |
| `schedule`    | `reported`  | 只报良/不良件数（现网）      | 现网公式：`(折算报工数) × pieceRate` 或计时公式   |
| `schedule`    | `itemized`  | 报件数 **且** 必填分项明细   | `Σ(分项 qty × unitPriceSnapshot)`；件数不参与乘价 |
| `itemized`    | `itemized`  | 主界面为分项明细；件数可不填 | 同上分项求和                                      |
| `itemized`    | `reported`  | —                            | **配置禁止**                                      |

### 5.1 补充规则

1. **分项剩余（P1，可降级）：** 有 `plannedQtyPerPiece` 时，任务分项总计划 = `plannedQtyPerPiece × 排产数`，校验累计报工 ≤ 总计划；未配置计划量则仅正数校验。降级时不做累计上限，只保留正数校验。
2. **多人共享任务：** 各人各自提交报工记录 + 分项；工资按报工人归集。
3. **审核：** 可改件数和/或分项数量、分项单价；已审核锁定。
4. **快速报工：** 一期不支持分项口径。
5. **不良：** 分项计薪一期不做分项级不良折扣；可用整单质量扣款 / 固定扣款。

## 6. 工资汇总与公式

在 `calcProcessReportWage`（或等价入口）按任务/报工快照的 `wageQtyMode` 分支：

| wageQtyMode | 公式                                                         |
| ----------- | ------------------------------------------------------------ |
| `reported`  | 现网三套不变（批量计件×计件 / 批量计件×计时 / 时长×计时）    |
| `itemized`  | `Σ(workItems.qty × unitPriceSnapshot) + 固定补贴 − 质量扣款` |

### 6.1 展示与台账

- `wageQtyMode=itemized`：工资汇总展示分项合计表；「单件计价单价」标为不适用或隐藏。
- 推送小程序「工时工资」：一期可只推汇总金额；Web 工资详情可下钻 `workItems`。
- `salaryStatsAggregate`：分项模式用分项求和结果，禁止再对 `goodQty × pieceRate`。

## 7. 兼容与迁移

| 对象           | 策略                                            |
| -------------- | ----------------------------------------------- |
| 已有工序       | 默认 `schedule` + `reported`，无模板            |
| 已有 laborRows | 无 `workItemRates`，行为不变                    |
| 已有报工记录   | 无 `workItems`，走 `reported` 路径              |
| 启用分项顺序   | 改工序口径+模板 → 补产品分项单价 → 再下发新任务 |
| 在制任务       | 以任务快照口径为准                              |

## 8. 一期不做

- 按分项拆任务 / 分项齐套门控（与极简非时序一致）
- 快速报工分项
- `itemized + reported` 组合
- 分项级不良折扣矩阵
- 工序模板在产品侧随意增删分项（产品只维护模板内单价与计划量）

## 9. 验收要点

- [ ] 默认工序下发/报工/计薪与现网一致
- [ ] 工序可配置两口径；非法组合无法保存
- [ ] 分项模板在工序维护；单价在产品 labor 维护；缺价下发拦截
- [ ] `schedule + itemized`：件数与分项均可录；工资按分项求和
- [ ] `itemized + itemized`：以分项为主报工；工资按分项求和
- [ ] 多人领取同一任务，各自报不同分项，工资分别归属
- [ ] 已下发任务不受事后主数据改价影响（快照）
- [ ] 审核可调分项数量/单价并重算；审核后锁定

## 10. 关键现网模块（实现时对照）

| 主题       | 路径                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| 任务下发   | `src/utils/mobileTaskDispatch.js`、`workOrderDispatchHelpers.js`               |
| 执行模式   | `src/utils/taskExecutionMode.js`                                               |
| labor 解析 | `src/utils/laborConfigResolver.js`                                             |
| 工资计算   | `src/utils/processReportWageCalc.js`、`constants/processReportWageFormulas.js` |
| 报工 store | `src/store/processReportStore.js`                                              |
| 工资 UI    | `src/views/production/components/ProcessReportWageSummary.vue`                 |
| 工序配置   | `src/views/product-process/components/ProcessConfigFormModal.vue`              |
| labor 表单 | `MasterItemFormModal.vue` / `ProductFormModal.vue`                             |
