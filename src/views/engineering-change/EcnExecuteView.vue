<template>
  <div class="ecn-execute-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="goBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">执行工程变更</span>
            <a-tag color="success">审批已通过</a-tag>
          </div>
        </div>

        <div class="section-card">
          <div class="section-title">变更技术内容</div>
          <EcnChangeItemsReadonlyTable :items="changeItems" />
        </div>

        <div class="section-card">
          <div class="section-title">执行配置</div>
          <p v-if="record.impact?.wipOrders" class="wip-hint">
            当前有
            <strong>{{ record.impact.wipOrders }}个</strong>
            在制工单使用旧版 BOM
          </p>
          <div v-if="execConfig" class="exec-config-readonly">
            <div class="radio-main">{{ execConfig.label }}</div>
            <div class="radio-sub">{{ execConfig.sub }}</div>
          </div>
          <span v-else class="empty-text">—</span>
        </div>

        <div v-if="!isReadonly" class="page-footer">
          <a-space>
            <a-button @click="goBack">取消</a-button>
            <a-button type="primary" :loading="submitting" @click="handleExecute">
              确认执行
            </a-button>
          </a-space>
        </div>
      </template>
    </a-spin>
  </div>
</template>

<script>
export default { name: 'EcnExecuteView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { ECN_STATUS, findExecConfigOption } from '@/constants/ecn'
import { resolveChangeRequestModule } from '@/constants/changeRequestModule'
import EcnChangeItemsReadonlyTable from './components/EcnChangeItemsReadonlyTable.vue'

const route = useRoute()
const router = useRouter()
const moduleConfig = resolveChangeRequestModule(route)
const submitting = ref(false)

const record = computed(() => moduleConfig.store.findById(route.params.id))
const changeItems = computed(() => record.value?.changeItems || [])
const execConfig = computed(() => findExecConfigOption(record.value?.wipHandling))

const isReadonly = computed(
  () =>
    record.value?.status === ECN_STATUS.EXECUTING ||
    record.value?.status === ECN_STATUS.EXECUTED,
)

function goBack() {
  router.push(moduleConfig.listPath)
}

function handleExecute() {
  submitting.value = true
  const res = moduleConfig.store.startExecution(record.value.id, {})
  submitting.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  moduleConfig.store.completeExecution(record.value.id)
  message.success('变更已执行')
  goBack()
}
</script>

<style lang="less" scoped>
.ecn-execute-page {
  margin: -12px;
  padding: 0 12px 64px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  padding: 12px 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  padding: 0 4px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.wip-hint {
  font-size: 13px;
  color: #595959;
  margin-bottom: 12px;
}

.exec-config-readonly {
  padding: 10px 12px;
  border: 1px solid #91caff;
  border-radius: 6px;
  background: #e6f4ff;
}

.radio-main {
  font-size: 13px;
  color: #262626;
  line-height: 1.5;
}

.radio-sub {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.empty-text {
  color: #bfbfbf;
}

.page-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  margin: 0 -12px;
}
</style>
