<template>
  <div class="settle-entry">
    <a-form-item required class="entry-mode-item">
      <template #label>
        <span class="field-label">
          <UnorderedListOutlined />
          结算数量怎么填
        </span>
      </template>
      <a-radio-group :value="mode" :options="modeOptions" @change="onModeChange" />
      <div class="vl-tip">
        结算单位（{{ settleUnit }}）与库存单位分开计。入库件数取{{ pieceCountLabel }}，当前
        {{ pieceCount }}。统一单件：合计 = 单件结算数量 × 入库件数。逐件：合计 =
        各件之和。直接填合计：只填这一行的合计。
      </div>
    </a-form-item>

    <a-form-item v-if="mode === SETTLE_ENTRY_MODE.UNIFORM" required>
      <template #label>
        <span class="field-label">
          <UnorderedListOutlined />
          单件结算数量（{{ settleUnit }}）
        </span>
      </template>
      <a-input-number
        :value="line.settleUniformValue"
        :min="0.0001"
        :precision="4"
        :formatter="inputNumberFormatter"
        :parser="inputNumberParser"
        placeholder="每件相同"
        style="width: 100%"
        @update:value="onUniformInput"
      />
    </a-form-item>

    <a-form-item v-else-if="mode === SETTLE_ENTRY_MODE.TOTAL" required>
      <template #label>
        <span class="field-label">
          <UnorderedListOutlined />
          结算数量合计（{{ settleUnit }}）
        </span>
      </template>
      <a-input-number
        :value="line.settleQty"
        :min="0.0001"
        :precision="4"
        :formatter="inputNumberFormatter"
        :parser="inputNumberParser"
        placeholder="本行合计"
        style="width: 100%"
        @update:value="onTotalInput"
      />
    </a-form-item>

    <div v-else class="piece-list">
      <div class="piece-list-head">
        <span>逐件结算数量（{{ settleUnit }}）</span>
        <span class="piece-progress">已填 {{ filledCount }}/{{ pieceCount }}</span>
      </div>
      <div v-if="!pieceCount" class="vl-tip">请先填写整数入库件数，或改用直接填合计</div>
      <template v-else>
        <a-radio-group
          v-model:value="pieceEditMode"
          size="small"
          option-type="button"
          class="piece-edit-mode"
          @change="onPieceEditModeChange"
        >
          <a-radio-button value="paste">批量粘贴</a-radio-button>
          <a-radio-button value="grid">逐条编辑</a-radio-button>
        </a-radio-group>
        <div v-if="pieceEditMode === 'paste'" class="piece-paste">
          <a-textarea
            v-model:value="pasteText"
            :rows="6"
            :placeholder="`每行一个数值，共需 ${pieceCount} 个（${settleUnit}）`"
          />
          <div class="piece-paste-bar">
            <a-button type="primary" size="small" @click="applyPaste">应用粘贴内容</a-button>
            <span class="vl-tip">当前识别 {{ pasteParsedCount }} 个数值</span>
          </div>
        </div>
        <div v-else>
          <div class="piece-quick-fill">
            <a-input-number
              v-model:value="quickFill"
              :min="0.0001"
              :precision="4"
              placeholder="快捷填充值"
              style="width: 140px"
            />
            <a-button size="small" @click="fillEmpty">填充未填项</a-button>
            <a-button size="small" @click="fillAll">全部覆盖</a-button>
          </div>
          <div class="piece-grid">
            <div v-for="idx in pageIndexes" :key="idx" class="piece-cell">
              <span class="piece-idx">{{ idx + 1 }}</span>
              <a-input-number
                :value="(line.settlePieceValues || [])[idx]"
                :min="0.0001"
                :precision="4"
                size="small"
                style="flex: 1"
                placeholder="数量"
                @update:value="(v) => onPieceInput(idx, v)"
              />
            </div>
          </div>
          <div v-if="pageCount > 1" class="piece-pagination">
            <a-pagination
              v-model:current="page"
              size="small"
              :total="pieceCount"
              :page-size="PAGE_SIZE"
              :show-size-changer="false"
              show-less-items
            />
          </div>
        </div>
      </template>
    </div>

    <div class="vl-tip preview-sum">
      结算合计预览：<strong>{{ formatQty(line.settleQty) }}</strong> {{ settleUnit }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { UnorderedListOutlined } from '@ant-design/icons-vue'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import {
  SETTLE_ENTRY_MODE,
  getSettleEntryModeOptions,
  isInboundDualUnitLine,
  resolveInboundPieceCount,
  resolveSettleEntryMode,
} from '@/utils/inboundLineHelpers'

const props = defineProps({
  line: { type: Object, required: true },
})

const emit = defineEmits(['patch'])

const modeOptions = getSettleEntryModeOptions()
const PAGE_SIZE = 24
const pieceEditMode = ref('grid')
const pasteText = ref('')
const quickFill = ref(null)
const page = ref(1)

const mode = computed(() => resolveSettleEntryMode(props.line))
const settleUnit = computed(() => props.line?.settleUnit || 'kg')
const pieceCount = computed(() => resolveInboundPieceCount(props.line || {}))
const pieceCountLabel = computed(() =>
  isInboundDualUnitLine(props.line || {}) ? '点收数量' : '入库数量',
)

const filledCount = computed(() => {
  const list = props.line?.settlePieceValues || []
  return list.filter((v) => Number(v) > 0).length
})

const pageCount = computed(() => Math.max(1, Math.ceil(pieceCount.value / PAGE_SIZE)))
const pageIndexes = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, pieceCount.value)
  const indexes = []
  for (let i = start; i < end; i += 1) indexes.push(i)
  return indexes
})

function parsePaste(text) {
  return String(text || '')
    .split(/[\s,;，；\t\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
}

const pasteParsedCount = computed(() => parsePaste(pasteText.value).length)

function formatQty(val) {
  return formatNumber(val, 4, { empty: '0' })
}

function commit(partial) {
  emit('patch', partial)
}

function buildPieceList(count, src = props.line.settlePieceValues) {
  const list = Array.isArray(src) ? src : []
  return Array.from({ length: count }, (_, i) =>
    list[i] != null && list[i] !== '' ? list[i] : null,
  )
}

function pieceListToText(list = []) {
  return list.map((v) => (Number(v) > 0 ? String(v) : '')).join('\n')
}

function onModeChange(e) {
  const next = e?.target?.value || SETTLE_ENTRY_MODE.TOTAL
  const partial = { settleEntryMode: next }
  if (next === SETTLE_ENTRY_MODE.UNIFORM && !(Number(props.line.settleUniformValue) > 0)) {
    const rate = Number(props.line.standardUnitWeight)
    if (rate > 0) partial.settleUniformValue = rate
  }
  if (next === SETTLE_ENTRY_MODE.PIECE) {
    partial.settlePieceValues = buildPieceList(pieceCount.value)
    pieceEditMode.value = pieceCount.value >= 12 ? 'paste' : 'grid'
    pasteText.value = pieceListToText(partial.settlePieceValues)
  }
  commit(partial)
}

function onUniformInput(value) {
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.UNIFORM,
    settleUniformValue: value,
  })
}

function onTotalInput(value) {
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.TOTAL,
    settleQty: value,
    settleUniformValue: undefined,
    settlePieceValues: undefined,
  })
}

function onPieceInput(idx, value) {
  const next = buildPieceList(pieceCount.value)
  next[idx] = value
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.PIECE,
    settlePieceValues: next,
  })
}

function syncPasteFromList() {
  pasteText.value = pieceListToText(props.line.settlePieceValues || [])
}

function onPieceEditModeChange() {
  if (pieceEditMode.value === 'paste') syncPasteFromList()
}

function applyPaste() {
  const n = pieceCount.value
  if (!(n > 0)) {
    message.warning('请先填写整数入库件数')
    return
  }
  const parsed = parsePaste(pasteText.value)
  if (parsed.length < n) {
    message.warning(`共需 ${n} 个数值，当前仅识别到 ${parsed.length} 个`)
    return
  }
  if (parsed.length > n) message.info(`识别到 ${parsed.length} 个，已取前 ${n} 个`)
  const next = parsed.slice(0, n)
  pasteText.value = pieceListToText(next)
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.PIECE,
    settlePieceValues: next,
  })
  message.success(`已应用 ${n} 条结算数量`)
}

function fillEmpty() {
  const val = Number(quickFill.value)
  if (!(val > 0)) {
    message.warning('请先输入快捷填充值')
    return
  }
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.PIECE,
    settlePieceValues: buildPieceList(pieceCount.value).map((v) => (Number(v) > 0 ? v : val)),
  })
}

function fillAll() {
  const val = Number(quickFill.value)
  if (!(val > 0)) {
    message.warning('请先输入快捷填充值')
    return
  }
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.PIECE,
    settlePieceValues: Array.from({ length: pieceCount.value }, () => val),
  })
}

watch(pasteText, () => {
  if (pieceEditMode.value !== 'paste' || mode.value !== SETTLE_ENTRY_MODE.PIECE) return
  const n = pieceCount.value
  const parsed = parsePaste(pasteText.value)
  if (!(n > 0) || parsed.length !== n) return
  commit({
    settleEntryMode: SETTLE_ENTRY_MODE.PIECE,
    settlePieceValues: parsed,
  })
})

watch(
  pieceCount,
  (n, prev) => {
    if (prev === undefined) return
    if (mode.value === SETTLE_ENTRY_MODE.PIECE && n !== prev) {
      if (page.value > pageCount.value) page.value = pageCount.value
      commit({ settlePieceValues: buildPieceList(n) })
      return
    }
    commit({})
  },
  { immediate: true },
)
</script>

<style lang="less" scoped>
.settle-entry {
  margin-bottom: 8px;
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.entry-mode-item {
  margin-bottom: 12px;
}

.vl-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.preview-sum {
  margin-bottom: 0;
}

.piece-list {
  margin-top: 8px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.piece-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.piece-progress {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.piece-edit-mode,
.piece-quick-fill,
.piece-paste-bar {
  margin-bottom: 8px;
}

.piece-quick-fill,
.piece-paste-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.piece-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.piece-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.piece-idx {
  width: 28px;
  color: rgba(0, 0, 0, 0.45);
  text-align: right;
}
</style>
