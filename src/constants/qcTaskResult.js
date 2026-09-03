/** 质检任务结果常量（独立模块，避免 store ↔ utils 循环依赖） */

export const QC_TASK_RESULT = {
  PASS: '质检通过',
  FAIL: '质检不通过',
  PARTIAL: '部分通过',
}

export const QC_TASK_RESULT_OPTIONS = Object.values(QC_TASK_RESULT)
