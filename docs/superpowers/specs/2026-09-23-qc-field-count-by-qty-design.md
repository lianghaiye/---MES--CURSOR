# 检验项「按数量统计」

**日期：** 2026-09-23  
**分支：** `feature/qc-field-count-by-qty`  
**状态：** 实现中

## 能力

- 模板/检验项库：基础指标可开「按数量统计」开关（`countByQty`）
- 录入：开启后展示合格数 / 不合格数；`不合格数 > 0` → 本项未达标
- 校验：合格数 + 不合格数 ≤ 质检数量，且合计 > 0（必填时）
- 整单结论：沿用现有 ALL_PASS / KEY_FIELDS，计数项视为可判定项

## 存储

字段值：`{ passQty, failQty }`（写入 `fieldValues` / `fieldMap`）

## 涉及文件

- `src/utils/qcFieldCountByQty.js`
- `src/utils/qcFieldStandard.js`
- `src/utils/qcTemplateSheetPass.js`
- `src/views/quality/components/QcFieldEditorForm.vue`
- `src/views/quality/components/QcTemplateFormModal.vue`
- `src/views/quality/QcTaskInspectView.vue`
- `src/mock/qcTemplates.js`（演示：外观检查 / 回货外观）
