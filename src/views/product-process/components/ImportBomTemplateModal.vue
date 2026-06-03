<template>
  <a-modal
    :open="open"
    title="从模板创建"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <a-alert
      type="info"
      show-icon
      class="tip"
      message="仅可选择已生效（使用中）的 BOM 作为模板；导入后将带入该 BOM 的下级物料清单，不会替换当前根节点。"
    />
    <a-form layout="vertical" class="form-wrap">
      <a-form-item label="BOM 模板" required>
        <a-select
          v-model:value="selectedKey"
          show-search
          placeholder="请选择已生效的 BOM 模板"
          :options="templateOptions"
          :filter-option="filterTpl"
        />
      </a-form-item>
      <template v-if="preview">
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item label="BOM编号">{{ preview.bomNo }}</a-descriptions-item>
          <a-descriptions-item label="BOM名称">{{ preview.bomName }}</a-descriptions-item>
          <a-descriptions-item label="版本">{{ preview.version }}</a-descriptions-item>
          <a-descriptions-item label="生效日期">{{ preview.effectiveAt }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-form>
    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :disabled="!selectedKey" @click="confirm">确定导入</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { bomTemplateCatalog, importTemplateChildren } from '@/mock/bomTemplates'
import { productBomState } from '@/store/productBomStore'

const props = defineProps({
  open: Boolean,
  hasRoot: Boolean,
})
const emit = defineEmits(['update:open', 'imported'])

const selectedKey = ref(undefined)

const templateOptions = computed(() => {
  const activeIds = new Set(
    productBomState.boms.filter((b) => b.status === '使用中').map((b) => b.id),
  )
  return bomTemplateCatalog
    .filter((t) => activeIds.has(t.bomId))
    .map((t) => ({
      label: `${t.bomNo} ${t.bomName}（${t.version}）`,
      value: t.templateKey,
    }))
})

const preview = computed(() =>
  bomTemplateCatalog.find((t) => t.templateKey === selectedKey.value),
)

watch(
  () => props.open,
  (v) => {
    if (v) selectedKey.value = undefined
  },
)

function filterTpl(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function confirm() {
  if (!props.hasRoot) {
    message.warning('请先在基础信息中选择产品/物料，以建立 BOM 根节点')
    return
  }
  if (!selectedKey.value) {
    message.warning('请选择 BOM 模板')
    return
  }
  const data = importTemplateChildren(selectedKey.value)
  if (!data) {
    message.error('模板数据不可用')
    return
  }
  emit('imported', data)
  emit('update:open', false)
  message.success('已从模板带入下级物料清单')
}
</script>

<style lang="less" scoped>
.tip {
  margin-bottom: 12px;
}
.form-wrap {
  margin-top: 8px;
}
</style>
