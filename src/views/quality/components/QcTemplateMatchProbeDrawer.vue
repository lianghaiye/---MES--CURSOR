<template>
  <a-drawer
    :open="open"
    title="匹配试算 · 查生效模板"
    placement="right"
    width="560"
    destroy-on-close
    @close="handleClose"
  >
    <a-alert type="info" show-icon style="margin-bottom: 16px">
      <template #message>
        按与建单相同的规则试算：单产品 &gt; 产品类别 &gt; 全局自定义 &gt;
        系统通用。选择业务类型与产品后点击试算。
      </template>
    </a-alert>

    <a-form layout="vertical" class="probe-form">
      <a-form-item label="业务类型" required>
        <a-select
          v-model:value="form.bizScope"
          placeholder="请选择业务类型"
          :options="bizScopeOpts"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="产品 / 物料">
        <div class="item-pick-row">
          <a-select
            v-model:value="form.itemCode"
            show-search
            allow-clear
            placeholder="输入编码/名称搜索"
            style="flex: 1; min-width: 0"
            :filter-option="false"
            :options="itemSearchOptions"
            @search="onItemSearch"
            @change="onItemCodeChange"
          />
          <a-button type="link" @click="itemPickerOpen = true">查看更多</a-button>
        </div>
        <div v-if="form.itemName || form.categoryName" class="item-meta">
          <span v-if="form.itemName">名称：{{ form.itemName }}</span>
          <span v-if="form.categoryName">类别：{{ form.categoryName }}</span>
        </div>
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" :loading="probing" @click="runProbe">试算</a-button>
          <a-button @click="resetForm">重置</a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <template v-if="probeResult">
      <div v-if="!probeResult.ok" class="result-empty">
        <a-empty :description="probeResult.message || '试算失败'" />
      </div>
      <template v-else>
        <div class="section-title">当前生效模板</div>
        <a-descriptions bordered size="small" :column="1" class="winner-block">
          <a-descriptions-item label="模板编号">
            {{ probeResult.template?.code || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="模板名称">
            {{ probeResult.template?.name || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="业务类型">
            {{ probeResult.template?.bizScope || form.bizScope || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="适用范围">
            {{ qcTemplateScopeTypeLabel(probeResult.template?.scopeType) }}
          </a-descriptions-item>
          <a-descriptions-item label="命中原因">
            <a-tag color="blue">{{ probeResult.matchSourceLabel }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>
        <div class="priority-tip">{{ probeResult.priorityTip }}</div>

        <div class="section-title">各优先级候选</div>
        <div v-for="layer in probeResult.layers" :key="layer.key" class="layer-block">
          <div class="layer-head">
            <span>{{ layer.priority }}. {{ layer.label }}</span>
            <span class="layer-count">{{ layer.items.length }} 份</span>
          </div>
          <a-empty
            v-if="!layer.items.length"
            description="无候选"
            :image="null"
            class="layer-empty"
          />
          <ul v-else class="layer-list">
            <li v-for="item in layer.items" :key="item.id || item.code">
              <span class="item-code">{{ item.code }}</span>
              <span class="item-name">{{ item.name }}</span>
              <a-tag v-if="item.isWinner" color="success">生效</a-tag>
              <a-tag v-else color="default">未命中</a-tag>
            </li>
          </ul>
        </div>
      </template>
    </template>

    <SelectBomMaterialModal
      v-model:open="itemPickerOpen"
      title="选择产品"
      :multiple="false"
      hide-add-material
      :include-spu-templates="true"
      :spu-can-sell-only="false"
      @selected="onItemPicked"
    />
  </a-drawer>
</template>

<script>
export default { name: 'QcTemplateMatchProbeDrawer' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { qcTemplateBizScopeOptions, qcTemplateScopeTypeLabel } from '@/mock/qcTemplates'
import { probeQcTemplateMatch } from '@/utils/qcTemplateMatchService'
import { buildBomSubItemPickerRows, filterBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])

const bizScopeOpts = qcTemplateBizScopeOptions.map((v) => ({ label: v, value: v }))
const itemPickerOpen = ref(false)
const itemSearchKeyword = ref('')
const probing = ref(false)
const probeResult = ref(null)

const form = reactive({
  bizScope: '来料质检',
  itemCode: undefined,
  itemName: '',
  categoryKey: '',
  categoryCode: '',
  categoryName: '',
})

const allItemRows = computed(() =>
  buildBomSubItemPickerRows({
    skipSubItemCount: true,
    includeSpuTemplates: true,
    spuCanSellOnly: false,
  }),
)

const itemSearchOptions = computed(() => {
  const kw = itemSearchKeyword.value.trim()
  const rows = filterBomSubItemPickerRows(allItemRows.value, kw).slice(0, 30)
  return rows.map((r) => ({
    value: r.code,
    label: `${r.code} ${r.name || ''}`.trim(),
  }))
})

watch(
  () => props.open,
  (val) => {
    if (val) {
      probeResult.value = null
    }
  },
)

function onItemSearch(kw) {
  itemSearchKeyword.value = kw || ''
}

function applyItemRow(row) {
  if (!row) return
  form.itemCode = row.code || row.value
  form.itemName = row.name || row.label || ''
  form.categoryKey = row.categoryKey || ''
  form.categoryCode = row.categoryCode || row.categoryKey || ''
  form.categoryName = row.categoryName || ''
}

function onItemCodeChange(code) {
  if (!code) {
    form.itemName = ''
    form.categoryKey = ''
    form.categoryCode = ''
    form.categoryName = ''
    return
  }
  const row = allItemRows.value.find((r) => r.code === code)
  applyItemRow(row || { code })
}

function onItemPicked(payload) {
  const picked = Array.isArray(payload) ? payload[0] : payload
  if (!picked) return
  const code = picked.code || picked.itemCode
  const row = allItemRows.value.find((r) => r.code === code) || {
    code,
    name: picked.name || picked.itemName,
    categoryKey: picked.categoryKey,
    categoryCode: picked.categoryCode || picked.categoryKey,
    categoryName: picked.categoryName,
  }
  applyItemRow(row)
}

function resetForm() {
  form.bizScope = '来料质检'
  form.itemCode = undefined
  form.itemName = ''
  form.categoryKey = ''
  form.categoryCode = ''
  form.categoryName = ''
  probeResult.value = null
}

function runProbe() {
  if (!form.bizScope) {
    message.warning('请选择业务类型')
    return
  }
  probing.value = true
  try {
    probeResult.value = probeQcTemplateMatch({
      bizScope: form.bizScope,
      itemCode: form.itemCode || '',
      categoryCode: form.categoryCode || '',
      categoryKey: form.categoryKey || '',
    })
  } finally {
    probing.value = false
  }
}

function handleClose() {
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.item-pick-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-meta {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  margin: 20px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.winner-block {
  margin-bottom: 8px;
}

.priority-tip {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.layer-block {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fafafa;
}

.layer-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.layer-count {
  color: rgba(0, 0, 0, 0.45);
  font-weight: 400;
}

.layer-empty {
  margin: 4px 0;
  :deep(.ant-empty-description) {
    font-size: 12px;
  }
}

.layer-list {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 13px;
  }
}

.item-code {
  color: #1677ff;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
