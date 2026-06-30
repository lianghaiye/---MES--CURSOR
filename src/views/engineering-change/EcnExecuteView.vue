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
          <a-steps :current="currentStep" size="small">
            <a-step title="确认影响范围" />
            <a-step title="更新数据" />
            <a-step title="通知确认" />
          </a-steps>
        </div>

        <div class="section-card">
          <div class="section-title">需要更新的数据</div>
          <div class="update-list">
            <div
              v-for="item in updateItems"
              :key="item.key"
              class="update-item"
              :class="{ optional: item.optional }"
            >
              <a-checkbox v-model:checked="item.checked" :disabled="isReadonly">
                <div class="update-content">
                  <div class="update-head">
                    <span class="update-label">{{ item.label }}</span>
                    <span class="update-impact">{{ item.impact }}</span>
                  </div>
                  <div class="update-desc">{{ item.desc }}</div>
                </div>
              </a-checkbox>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-title warn-title">
            <WarningOutlined />
            在制工单处理
          </div>
          <p class="wip-hint">
            当前有
            <strong>{{ record.impact?.wipOrders || 0 }}个</strong>
            在制工单使用旧版BOM，请选择处理方式：
          </p>
          <a-radio-group v-model:value="wipHandling" :disabled="isReadonly" class="wip-radio">
            <a-radio value="continue_old">
              <div class="radio-main">继续按旧版执行（推荐，不影响生产）</div>
            </a-radio>
            <a-radio value="switch_now">
              <div class="radio-main">立即切换新版（将在下一个工序开始生效）</div>
            </a-radio>
          </a-radio-group>
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { ECN_STATUS } from '@/constants/ecn'
import { useChangeRequestModule } from '@/composables/useChangeRequestModule'

const route = useRoute()
const router = useRouter()
const mod = useChangeRequestModule()
const moduleConfig = mod.value
const submitting = ref(false)
const wipHandling = ref('continue_old')
const updateItems = ref([])

const record = computed(() => moduleConfig.store.findById(route.params.id))

const isReadonly = computed(() => record.value?.status === ECN_STATUS.EXECUTING)

const currentStep = computed(() => {
  if (record.value?.status === ECN_STATUS.EXECUTING) return 2
  return 1
})

watch(
  record,
  (row) => {
    if (!row) return
    updateItems.value = JSON.parse(JSON.stringify(row.updateItems || []))
    wipHandling.value = row.wipHandling || 'continue_old'
  },
  { immediate: true },
)

function goBack() {
  router.push(moduleConfig.listPath)
}

function handleExecute() {
  submitting.value = true
  const res = moduleConfig.store.startExecution(record.value.id, {
    updateItems: updateItems.value,
    wipHandling: wipHandling.value,
  })
  submitting.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  moduleConfig.store.completeExecution(record.value.id)
  message.success('变更执行已完成')
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

  &.warn-title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #fa8c16;
  }
}

.update-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.update-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;

  &.optional {
    opacity: 0.85;
  }

  :deep(.ant-checkbox-wrapper) {
    align-items: flex-start;
    width: 100%;
  }
}

.update-content {
  flex: 1;
}

.update-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.update-label {
  font-weight: 500;
  font-size: 13px;
}

.update-impact {
  font-size: 12px;
  color: #8c8c8c;
}

.update-desc {
  font-size: 12px;
  color: #595959;
}

.wip-hint {
  font-size: 13px;
  color: #595959;
  margin-bottom: 12px;
}

.wip-radio {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-main {
  font-size: 13px;
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
