<template>
  <div class="bom-root-product-editor">
    <div class="info-block-head">
      <div class="info-block-title">根产品</div>
      <a-checkbox
        v-if="!readonly"
        :checked="syncToMaster"
        @update:checked="(v) => emit('update:syncToMaster', v)"
      >
        同步到主数据
      </a-checkbox>
    </div>

    <a-form layout="inline" size="small" class="inline-info-form">
      <div class="root-fields-grid">
        <div class="grid-row cols-4">
          <a-form-item :label="itemLabel" class="grid-field-item">
            <div class="product-name-row">
              <a-auto-complete
                v-if="!readonly"
                v-model:value="nameDraft"
                :options="displayOptions"
                allow-clear
                size="small"
                class="product-select field-control"
                :placeholder="`搜索${itemLabel}编码/名称`"
                :filter-option="false"
                :disabled="!canChangeItem"
                :dropdown-match-select-width="360"
                :get-popup-container="getPopupContainer"
                @search="onSearch"
                @select="onSelectOption"
                @change="onNameChange"
                @dropdown-visible-change="onDropdownVisibleChange"
              >
                <template #dropdownRender="{ menuNode: menu }">
                  <div>
                    <component :is="menu" />
                    <template v-if="createKeyword">
                      <a-divider style="margin: 4px 0" />
                      <div class="create-option-row" @mousedown.prevent @click="onCreateClick">
                        创建「{{ createKeyword }}」
                      </div>
                    </template>
                    <a-divider style="margin: 4px 0" />
                    <div class="search-more-row" @mousedown.prevent @click="emit('open-picker')">
                      搜索更多...
                    </div>
                  </div>
                </template>
              </a-auto-complete>
              <a-input
                v-else
                :value="itemName || '—'"
                disabled
                class="product-select field-control"
              />
              <a-tooltip :title="openDetailTitle">
                <a-button
                  type="text"
                  size="small"
                  class="open-detail-btn"
                  :disabled="!canOpenDetail"
                  @click="emit('open-detail')"
                >
                  <ExportOutlined />
                </a-button>
              </a-tooltip>
            </div>
          </a-form-item>

          <a-form-item label="编号" class="grid-field-item">
            <a-input
              :value="itemCode || '—'"
              disabled
              class="field-control"
              placeholder="选择产品后带出"
            />
          </a-form-item>

          <a-form-item label="规格型号" class="grid-field-item">
            <a-input
              v-if="!readonly"
              :value="specModel"
              allow-clear
              class="field-control"
              placeholder="规格型号"
              @update:value="(v) => emit('update:specModel', v)"
            />
            <a-input v-else :value="specModel || '—'" disabled class="field-control" />
          </a-form-item>

          <a-form-item label="材质" class="grid-field-item">
            <a-input
              v-if="!readonly"
              :value="material"
              allow-clear
              class="field-control"
              placeholder="材质"
              @update:value="(v) => emit('update:material', v)"
            />
            <a-input v-else :value="material || '—'" disabled class="field-control" />
          </a-form-item>
        </div>

        <div class="grid-row cols-2">
          <a-form-item label="图号" class="grid-field-item">
            <a-input
              v-if="!readonly"
              :value="drawingNo"
              allow-clear
              class="field-control"
              placeholder="图号"
              @update:value="(v) => emit('update:drawingNo', v)"
            />
            <a-input v-else :value="drawingNo || '—'" disabled class="field-control" />
          </a-form-item>

          <a-form-item label="工艺路线" class="grid-field-item">
            <a-select
              v-if="!readonly"
              :value="processRoute"
              allow-clear
              show-search
              class="field-control"
              placeholder="选择工艺路线"
              :filter-option="filterRoute"
              :options="processRouteOpts"
              @update:value="(v) => emit('update:processRoute', v)"
            />
            <a-input v-else :value="processRoute || '—'" disabled class="field-control" />
          </a-form-item>
        </div>

        <div class="grid-row cols-2">
          <a-form-item label="技术参数" class="grid-field-item grid-field-item-textarea">
            <a-textarea
              v-if="!readonly"
              :value="techParams"
              placeholder="技术参数"
              allow-clear
              :rows="2"
              class="field-control"
              @update:value="(v) => emit('update:techParams', v)"
            />
            <a-textarea
              v-else
              :value="techParams || '—'"
              disabled
              :rows="2"
              class="field-control"
            />
          </a-form-item>

          <a-form-item label="配置要求" class="grid-field-item grid-field-item-textarea">
            <a-textarea
              v-if="!readonly"
              :value="matchingRequirements"
              placeholder="配置要求"
              allow-clear
              :rows="2"
              class="field-control"
              @update:value="(v) => emit('update:matchingRequirements', v)"
            />
            <a-textarea
              v-else
              :value="matchingRequirements || '—'"
              disabled
              :rows="2"
              class="field-control"
            />
          </a-form-item>
        </div>
      </div>
    </a-form>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ExportOutlined } from '@ant-design/icons-vue'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { spuState } from '@/store/spuStore'

const props = defineProps({
  readonly: { type: Boolean, default: false },
  canChangeItem: { type: Boolean, default: true },
  itemType: { type: String, default: 'product' },
  itemId: { type: String, default: '' },
  itemName: { type: String, default: '' },
  itemCode: { type: String, default: '' },
  specModel: { type: String, default: '' },
  material: { type: String, default: '' },
  drawingNo: { type: String, default: '' },
  processRoute: { type: String, default: undefined },
  techParams: { type: String, default: '' },
  matchingRequirements: { type: String, default: '' },
  syncToMaster: { type: Boolean, default: false },
  version: { type: String, default: '' },
  processRouteOpts: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'update:itemName',
  'update:itemCode',
  'update:specModel',
  'update:material',
  'update:drawingNo',
  'update:processRoute',
  'update:techParams',
  'update:matchingRequirements',
  'update:syncToMaster',
  'select-item',
  'create-item',
  'open-picker',
  'open-detail',
])

const searchKeyword = ref('')
const nameDraft = ref(props.itemName || '')
const selecting = ref(false)
const DROPDOWN_LIMIT = 8

const isSpuMode = computed(() => props.itemType === 'spu')
const itemLabel = computed(() => (isSpuMode.value ? '产品族' : '产品'))

const canOpenDetail = computed(() => Boolean(props.itemId) && props.itemType !== 'spu')
const openDetailTitle = computed(() =>
  canOpenDetail.value
    ? '在新标签打开详情'
    : isSpuMode.value
      ? '产品族暂无独立详情页'
      : '请先选择产品',
)

watch(
  () => props.itemName,
  (val) => {
    if (selecting.value) return
    nameDraft.value = val || ''
  },
)

const catalog = computed(() => {
  void productInfoState.products
  void materialInfoState.materials
  void spuState.spus
  if (isSpuMode.value) {
    return (spuState.spus || []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      specModel: '',
      material: '',
      drawingNo: '',
      itemType: 'spu',
      raw: s,
    }))
  }
  const products = (productInfoState.products || []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    specModel: p.specModel || '',
    material: p.material || '',
    drawingNo: p.drawingNo || '',
    itemType: 'product',
    raw: p,
  }))
  const materials = (materialInfoState.materials || [])
    .filter((m) => !String(m.id || '').startsWith('prod-'))
    .map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      specModel: m.specModel || '',
      material: m.material || '',
      drawingNo: m.drawingNo || '',
      itemType: 'material',
      raw: m,
    }))
  return [...products, ...materials]
})

/** 与明细一致：option.value 用编码，展示 label 为 [编码] 名称 */
function optionValueOf(m) {
  return String(m.code || '').trim() || `${m.itemType}:${m.id}`
}

const displayOptions = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  let list = catalog.value
  if (kw) {
    list = list.filter(
      (m) =>
        String(m.code || '')
          .toLowerCase()
          .includes(kw) ||
        String(m.name || '')
          .toLowerCase()
          .includes(kw) ||
        String(m.specModel || '')
          .toLowerCase()
          .includes(kw),
    )
  }
  const sliced = (kw ? list : list.slice(0, DROPDOWN_LIMIT)).slice(0, kw ? 50 : DROPDOWN_LIMIT)
  const options = sliced.map((m) => ({
    value: optionValueOf(m),
    label: `[${m.code || '—'}] ${m.name}`,
    item: m,
  }))
  // 当前已选若不在列表，置顶保留
  if (props.itemId) {
    const curVal = props.itemCode || `${props.itemType}:${props.itemId}`
    if (!options.some((o) => o.value === curVal || o.item?.id === props.itemId)) {
      options.unshift({
        value: curVal,
        label: props.itemCode
          ? `[${props.itemCode}] ${props.itemName || ''}`
          : props.itemName || curVal,
        item: {
          id: props.itemId,
          code: props.itemCode,
          name: props.itemName,
          itemType: props.itemType,
          specModel: props.specModel,
          material: props.material,
          drawingNo: props.drawingNo,
        },
      })
    }
  }
  return options
})

/** 主数据中是否已有同名/同编码（精确匹配）；有则不展示「创建」 */
function catalogHasExactNameOrCode(kw) {
  const key = String(kw || '').trim()
  if (!key) return false
  return catalog.value.some(
    (m) => String(m.name || '').trim() === key || String(m.code || '').trim() === key,
  )
}

const createKeyword = computed(() => {
  if (props.readonly || !props.canChangeItem) return ''
  // 以当前输入为准（不要用已同步的 props.itemName，否则一改字就被当成「已存在」）
  const kw = String(searchKeyword.value || nameDraft.value || '').trim()
  if (!kw) return ''
  if (catalogHasExactNameOrCode(kw)) return ''
  return kw
})

function getPopupContainer() {
  return document.body
}

function filterRoute(input, option) {
  return String(option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase())
}

function onSearch(keyword) {
  searchKeyword.value = keyword ?? ''
}

function onDropdownVisibleChange(open) {
  if (open) {
    // 展开时先展示默认列表；保留输入框文案，搜索词清空以便列出候选项
    nextTick(() => {
      searchKeyword.value = ''
    })
  } else {
    searchKeyword.value = ''
    // 未点选/创建时，失焦恢复为当前根产品名称（输入不会自动建档）
    if (!selecting.value) {
      nextTick(() => {
        nameDraft.value = props.itemName || ''
      })
    }
  }
}

function onSelectOption(value, option) {
  selecting.value = true
  const item = option?.item || catalog.value.find((m) => optionValueOf(m) === value) || null
  if (item) {
    emit('select-item', item)
    nextTick(() => {
      nameDraft.value = item.name || ''
      selecting.value = false
      searchKeyword.value = ''
    })
    return
  }
  selecting.value = false
}

function onNameChange(val) {
  if (selecting.value) return
  const next = val ?? ''
  nameDraft.value = next
  // 仅作搜索关键字；不立刻改根名称、更不会自动创建产品
  searchKeyword.value = next
}

function onCreateClick() {
  const name = createKeyword.value
  if (!name) return
  selecting.value = true
  emit('create-item', { name })
  nextTick(() => {
    selecting.value = false
    searchKeyword.value = ''
  })
}
</script>

<style lang="less" scoped>
.info-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.info-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.product-name-row {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  min-width: 0;
}

.product-select {
  flex: 1;
  min-width: 0;

  /* 与明细单元格一致：白底可编辑 */
  :deep(.ant-select-selector),
  :deep(.ant-input) {
    background: #fff !important;
    color: rgba(0, 0, 0, 0.88) !important;
  }

  :deep(.ant-select-selection-item),
  :deep(.ant-select-selection-search-input) {
    color: rgba(0, 0, 0, 0.88) !important;
  }
}

.open-detail-btn {
  flex-shrink: 0;
  color: #722ed1;

  &:disabled {
    color: rgba(0, 0, 0, 0.25);
  }
}

.search-more-row,
.create-option-row {
  padding: 8px 12px;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;
  text-align: center;

  &:hover {
    background: #f5f5f5;
  }
}

.create-option-row {
  text-align: left;
}

.inline-info-form {
  width: 100%;

  .root-fields-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .grid-row {
    display: grid;
    width: 100%;
    gap: 8px 12px;
    align-items: flex-start;

    &.cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    &.cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .grid-field-item {
    margin-right: 0;
    margin-bottom: 0;
    min-width: 0;

    :deep(.ant-form-item-row) {
      flex-wrap: nowrap;
      width: 100%;
    }

    :deep(.ant-form-item-label) {
      flex: 0 0 auto;
      max-width: none;
    }

    :deep(.ant-form-item-control) {
      flex: 1;
      min-width: 0;
    }

    :deep(.ant-form-item-control-input) {
      width: 100%;
    }
  }

  .grid-field-item-textarea {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }
  }

  .field-control {
    width: 100%;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 12px;
    color: #666;
  }
}

@media (max-width: 1200px) {
  .inline-info-form {
    .grid-row.cols-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
