<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    width="520"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <template v-if="item">
      <a-descriptions bordered size="small" :column="1">
        <a-descriptions-item label="类型">{{ item.category }}</a-descriptions-item>
        <a-descriptions-item label="标题">{{ item.title }}</a-descriptions-item>
        <a-descriptions-item v-if="item.subtitle" label="摘要">{{
          item.subtitle
        }}</a-descriptions-item>
        <a-descriptions-item v-if="item.time" label="时间">{{ item.time }}</a-descriptions-item>
        <a-descriptions-item label="紧急程度">
          <a-tag :color="urgencyColor">{{ urgencyLabel }}</a-tag>
        </a-descriptions-item>
      </a-descriptions>

      <div v-if="previewFields.length" class="preview-block">
        <div class="preview-title">关键信息</div>
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item
            v-for="field in previewFields"
            :key="field.label"
            :label="field.label"
          >
            {{ field.value }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <div class="drawer-actions">
        <a-button @click="emit('update:open', false)">关闭</a-button>
        <a-button type="primary" @click="handleGo">前往处理</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])
const router = useRouter()

const drawerTitle = computed(() => props.item?.category || '待办详情')

const urgencyColor = computed(() => {
  if (props.item?.urgency === 'high') return 'red'
  if (props.item?.urgency === 'low') return 'default'
  return 'blue'
})

const urgencyLabel = computed(() => {
  if (props.item?.urgency === 'high') return '紧急'
  if (props.item?.urgency === 'low') return '一般'
  return '普通'
})

const previewFields = computed(() => {
  const payload = props.item?.payload
  if (!payload) return []
  const fields = []
  const push = (label, value) => {
    if (value !== undefined && value !== null && value !== '') fields.push({ label, value })
  }

  push('单号', payload.code || payload.docNo || payload.ecnNo || payload.scrapNo || payload.qcNo)
  push('状态', payload.status || payload.orderStatus || payload.qcStatus || payload.auditStatus)
  push('工作中心', payload.workCenter || payload.sourceWorkshop)
  push('产品', payload.productName || payload.itemName)
  push('数量', payload.qty ?? payload.scheduleQty ?? payload.planQty)
  push('交期', payload.deliveryDate)
  return fields.slice(0, 6)
})

function handleGo() {
  if (!props.item?.route) return
  emit('update:open', false)
  router.push({ path: props.item.route, query: props.item.query || {} })
}
</script>

<script>
export default { name: 'DirectorTodoDrawer' }
</script>

<style lang="less" scoped>
.preview-block {
  margin-top: 16px;
}

.preview-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.88);
}

.drawer-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
