# 工艺路线编辑页布局改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 工艺路线新增/编辑页：基本信息上移、适用范围交互、左栏拖宽、网格间隙插入列/行、右侧只读工序信息（保留文件配置）。

**Architecture:** 在现有 `FormCreateShell` + `ProcessRouteGridEditor` 上改布局；网格插入逻辑下沉到 `processRouteGrid.js`；适用范围展示文案与存储值解耦（展示 全局/单产品/产品类别，存储仍为 全部产品/单个物品/物品类别）。

**Tech Stack:** Vue 3、Ant Design Vue、现有 `processConfigStore` / `processRouteStore`

## Global Constraints

- 存储枚举不变：`全部产品` / `单个物品` / `物品类别`
- 最大步数 `MAX_ROUTE_STEPS=150`，最大并行 `MAX_ROUTE_PARALLEL=50`
- 左侧宽度一期不持久化
- 文件配置保留

---

### Task 1: 网格插入工具函数

**Files:**

- Modify: `src/utils/processRouteGrid.js`
- Create: `src/utils/processRouteGrid.insert.test.js`（若项目无单测 runner，改为在实现后用 Node 临时断言或跳过文件、在浏览器手工验）

**Interfaces:**

- Produces:
  - `insertStepAfter(grid, afterIndex) -> grid` — 在 `afterIndex`（0-based）之后插入一列空步；`afterIndex === -1` 表示插到最前
  - `insertRowAfter(grid, afterIndex) -> grid` — 在每步的 `afterIndex` 之后插入空行
  - `getSelectedCellMeta(...)` 扩展字段：`processCode`, `resourceType`, `reportMode`, `configLabels`（string[]）

- [ ] **Step 1: 在 `processRouteGrid.js` 增加插入与 meta 扩展**

```js
export function insertStepAfter(grid, afterIndex) {
  const g = normalizeGrid(grid)
  const rows = Math.max(1, g[0]?.length || 1)
  if (g.length >= MAX_ROUTE_STEPS) return g
  const empty = Array.from({ length: rows }, () => null)
  const idx = Math.max(-1, Math.min(afterIndex, g.length - 1))
  g.splice(idx + 1, 0, empty)
  return g
}

export function insertRowAfter(grid, afterIndex) {
  const g = normalizeGrid(grid)
  const rows = Math.max(1, g[0]?.length || 1)
  if (rows >= MAX_ROUTE_PARALLEL) return g
  const idx = Math.max(-1, Math.min(afterIndex, rows - 1))
  g.forEach((step) => {
    step.splice(idx + 1, 0, null)
  })
  return g
}
```

`getSelectedCellMeta` 增加：

```js
import { getOperationLabels } from '@/store/processConfigStore'

// inside return:
processCode: proc?.code || '',
resourceType: proc?.resourceType || '',
reportMode: proc?.reportMode || '',
isBlanking: Boolean(proc?.isBlanking),
configLabels: [
  ...(proc?.isBlanking ? ['下料'] : []),
  ...getOperationLabels(proc),
],
```

- [ ] **Step 2: 手工快速校验（Node）**

```bash
node -e "
const { createEmptyGrid, insertStepAfter, insertRowAfter } = require('./src/utils/processRouteGrid.js')
"
```

若 ESM 无法 require，跳过，改在浏览器里插入验证。

- [ ] **Step 3: Commit**

```bash
git add src/utils/processRouteGrid.js
git commit -m "feat: 工艺路线网格支持中间插入步/行工具函数"
```

---

### Task 2: 基本信息上移 + 适用范围 UI

**Files:**

- Modify: `src/views/product-process/components/ProcessRouteEditorModal.vue`
- Modify: `src/views/product-process/components/ProcessRouteGridEditor.vue`（去掉 center 内 basic slot 区域；改为外层 slot 或由 EditorModal 自己排）

**Layout change:**

```vue
<!-- ProcessRouteEditorModal -->
<FormCreateShell ...>
  <div class="route-editor-page">
    <div class="modal-basic-card form-section-box">
      <!-- 基本信息：适用范围 radio + 条件适用对象 -->
    </div>
    <ProcessRouteGridEditor ... />
  </div>
</FormCreateShell>
```

`ProcessRouteGridEditor` 删除 `#basic` / `.basic-area`。

适用范围：

```vue
<a-form-item label="适用范围" required>
  <a-radio-group v-model:value="form.applyScope" @change="onScopeChange">
    <a-radio value="全部产品">全局</a-radio>
    <a-radio value="单个物品">单产品</a-radio>
    <a-radio value="物品类别">产品类别</a-radio>
  </a-radio-group>
</a-form-item>
<a-form-item
  v-if="form.applyScope === '单个物品' || form.applyScope === '物品类别'"
  label="适用对象"
  required
>
  <!-- 单个物品：只读展示 + 查看更多 打开 SelectProductMaterialModal -->
  <!-- 物品类别：tree-select；可保留类别类型切换在适用对象旁或折叠，优先不破匹配 -->
</a-form-item>
```

单产品适用对象行：输入框占位「输入编码/名称搜索」可先做 select show-search 或保持只读+查看更多（与稿一致至少「查看更多」）。

校验文案：`processRouteStore` 中「请选择工艺应用范围」改为「请选择适用范围」；物品相关提示改为「请选择适用对象」类。

- [ ] **Step 1: 改 EditorModal 结构与文案**
- [ ] **Step 2: GridEditor 移除 basic slot**
- [ ] **Step 3: 列表/详情文案映射**（`ProcessRouteView` / `ProcessRouteDetailView` 展示 全局/单产品/产品类别）
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: 工艺路线基本信息上移并改造适用范围"
```

---

### Task 3: 左栏独立盒子 + 拖宽；右栏只读工序信息

**Files:**

- Modify: `src/views/product-process/components/ProcessRouteGridEditor.vue`

左侧：

```vue
<div class="left-panel panel-box" :style="{ width: leftWidth + 'px' }">
  <div class="box-title">工序</div>
  <!-- category list + gallery -->
</div>
<div class="resize-handle" @mousedown="startResize" />
```

```js
const leftWidth = ref(220)
function startResize(e) {
  const startX = e.clientX
  const startW = leftWidth.value
  const onMove = (ev) => {
    leftWidth.value = Math.min(360, Math.max(180, startW + (ev.clientX - startX)))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
```

右侧：

```vue
<div class="right-panel panel-box">
  <template v-if="selectedMeta">
    <div class="box-title">工序信息</div>
    <div class="info-rows">
      <div class="info-row"><span class="k">工序名称：</span><span class="v">{{ selectedMeta.processName || '—' }}</span></div>
      <div class="info-row"><span class="k">工序编号：</span><span class="v">{{ selectedMeta.processCode || '—' }}</span></div>
      <div class="info-row"><span class="k">资源类型：</span><span class="v">{{ selectedMeta.resourceType || '—' }}</span></div>
      <div class="info-row"><span class="k">报工类型：</span><span class="v">{{ selectedMeta.reportMode || '—' }}</span></div>
      <div class="info-row">
        <span class="k">工序配置项：</span>
        <span class="v">
          <template v-if="selectedMeta.configLabels?.length">
            <a-tag v-for="l in selectedMeta.configLabels" :key="l">{{ l }}</a-tag>
          </template>
          <template v-else>—</template>
        </span>
      </div>
    </div>
    <div class="box-title">文件配置</div>
    <!-- 保留工艺文件 select -->
  </template>
  <div v-else class="right-empty">请点击网格中的工序</div>
</div>
```

中间 `center-panel` 也包一层 `panel-box`，三栏 `gap: 8px`，背景 `--page-bg`。

- [ ] **Step 1: 实现左栏拖宽与独立盒子**
- [ ] **Step 2: 右侧只读信息 + 保留文件配置**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: 工艺路线编辑区左右栏独立盒子与拖宽"
```

---

### Task 4: 网格间隙插入 UI

**Files:**

- Modify: `src/views/product-process/components/ProcessRouteGridEditor.vue`

表头：每个 step 后（含末列后追加）放「+」：

```vue
<div v-for="col in stepCount" :key="col" class="step-header-wrap">
  <div class="step-header">第{{ col }}步</div>
  <a-button
    type="link"
    size="small"
    class="gap-add-btn"
    :disabled="stepCount >= MAX_ROUTE_STEPS"
    @click="insertStepAt(col - 1)"
  >+</a-button>
</div>
```

行：

```vue
<!-- after each row-label / row cells -->
<a-button ... @click="insertRowAt(row - 1)">+</a-button>
```

```js
function insertStepAt(afterIndex) {
  if (stepCount.value >= MAX_ROUTE_STEPS) {
    message.warning(`最大步数 ${MAX_ROUTE_STEPS}`)
    return
  }
  localGrid.value = insertStepAfter(localGrid.value, afterIndex)
  // 选中索引顺延
  if (props.selectedStep > afterIndex) {
    emit('update:selectedStep', props.selectedStep + 1)
  }
  emitGrid()
}

function insertRowAt(afterIndex) {
  if (rowCount.value >= MAX_ROUTE_PARALLEL) {
    message.warning(`最大并行数 ${MAX_ROUTE_PARALLEL}`)
    return
  }
  localGrid.value = insertRowAfter(localGrid.value, afterIndex)
  if (props.selectedRow > afterIndex) {
    emit('update:selectedRow', props.selectedRow + 1)
  }
  emitGrid()
}
```

去掉原先「仅末列/末行才显示 +」的限制（末列后的 + 即追加）。

- [ ] **Step 1: 接入 insertStepAfter / insertRowAfter**
- [ ] **Step 2: 浏览器验：中间插入后漏工序可补**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: 工艺路线网格步/行间隙可插入"
```

---

### Task 5: 联调验收

- [ ] 打开 `/product-process/routing/new`：基本信息在标题下；适用范围三选一；全局无适用对象。
- [ ] 单产品：查看更多可选品；产品类别可选类。
- [ ] 左栏可拖宽；右栏点网格工序见只读字段 + 文件配置。
- [ ] 在第 2、3 步之间插入列，拖入工序成功；行同理。
- [ ] 保存后列表/详情适用范围文案正确。

---

## Spec coverage

| Spec              | Task      |
| ----------------- | --------- |
| 基本信息上移      | T2        |
| 适用范围 UI       | T2        |
| 左栏盒子+拖宽     | T3        |
| 间隙插入          | T1+T4     |
| 右侧只读+文件配置 | T3        |
| 存储兼容          | T2 Global |

## Placeholder scan

无 TBD / TODO 占位。
