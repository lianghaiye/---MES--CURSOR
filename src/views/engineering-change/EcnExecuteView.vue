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
            <a-tag :color="isExecuted ? 'success' : 'blue'">
              {{ isExecuted ? record.status : '审批已通过' }}
            </a-tag>
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

        <div class="section-card">
          <EcnExecuteRescheduleSection
            :record="record"
            :readonly="rescheduleDone"
            :refresh-key="refreshKey"
            v-model:work-item-keys="workItemKeys"
            v-model:old-action-by-key="oldActionByKey"
            v-model:new-action-by-key="newActionByKey"
            v-model:supply-form-by-key="supplyFormByKey"
            v-model:whole-plan-mode="wholePlanMode"
          />
        </div>

        <div v-if="dispositionSnapshot" class="section-card">
          <EcnDispositionResultSection :snapshot="dispositionSnapshot" />
        </div>

        <div class="page-footer">
          <a-space>
            <a-button @click="goBack">{{ rescheduleDone ? '返回列表' : '取消' }}</a-button>
            <a-button v-if="!rescheduleDone" :loading="saving" @click="handleSaveDraft">
              保存
            </a-button>
            <a-button
              v-if="!rescheduleDone"
              type="primary"
              :loading="submitting"
              @click="handleExecute"
            >
              确认执行并重排
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
import { ECN_RESCHEDULE_STATUS } from '@/constants/ecnPlanReschedule'
import { resolveChangeRequestModule } from '@/constants/changeRequestModule'
import { rescheduleEcnImpact } from '@/utils/ecnPlanImpact'
import EcnChangeItemsReadonlyTable from './components/EcnChangeItemsReadonlyTable.vue'
import EcnExecuteRescheduleSection from './components/EcnExecuteRescheduleSection.vue'
import EcnDispositionResultSection from './components/EcnDispositionResultSection.vue'

const route = useRoute()
const router = useRouter()
const moduleConfig = resolveChangeRequestModule(route)
const submitting = ref(false)
const saving = ref(false)
const refreshKey = ref(0)
const workItemKeys = ref([])
const oldActionByKey = ref({})
const newActionByKey = ref({})
const supplyFormByKey = ref({})
const wholePlanMode = ref(false)

const record = computed(() => moduleConfig.store.findById(route.params.id))
const changeItems = computed(() => record.value?.changeItems || [])
const execConfig = computed(() => findExecConfigOption(record.value?.wipHandling))
const dispositionSnapshot = computed(() => record.value?.rescheduleDisposition || null)

const isExecuted = computed(
  () =>
    record.value?.status === ECN_STATUS.EXECUTING || record.value?.status === ECN_STATUS.EXECUTED,
)

const rescheduleDone = computed(() => record.value?.rescheduleStatus === ECN_RESCHEDULE_STATUS.DONE)

function goBack() {
  router.push(moduleConfig.listPath)
}

function currentDraftPayload() {
  return {
    workItemKeys: workItemKeys.value,
    oldActionByKey: oldActionByKey.value,
    newActionByKey: newActionByKey.value,
    supplyFormByKey: supplyFormByKey.value,
    wholePlanMode: wholePlanMode.value,
  }
}

function applyReschedule() {
  return rescheduleEcnImpact(record.value, currentDraftPayload())
}

function handleSaveDraft() {
  if (!record.value?.id) return
  saving.value = true
  const res = moduleConfig.store.saveExecutionDraft?.(record.value.id, currentDraftPayload())
  saving.value = false
  if (!res?.ok) {
    message.warning(res?.message || '保存失败')
    return
  }
  message.success('已保存，可稍后继续执行')
}

function handleExecute() {
  submitting.value = true
  const wasExecuted = isExecuted.value
  if (!wasExecuted) {
    const res = moduleConfig.store.startExecution(record.value.id, {})
    if (!res.ok) {
      submitting.value = false
      message.warning(res.message)
      return
    }
    const done = moduleConfig.store.completeExecution(record.value.id)
    if (!done?.ok) {
      submitting.value = false
      message.warning(done?.message || '执行失败')
      return
    }
  }
  const reshaped = applyReschedule()
  submitting.value = false
  refreshKey.value += 1
  const parts = []
  if (!wasExecuted) parts.push('变更已执行')
  if (reshaped.refreshed) parts.push(`已整单换 BOM ${reshaped.refreshed} 项`)
  if (reshaped.updatedQty) parts.push(`已更新 ${reshaped.updatedQty} 处数量`)
  if (reshaped.cancelledWo) parts.push(`已作废 ${reshaped.cancelledWo} 张工单`)
  if (reshaped.cancelledOut) parts.push(`已作废 ${reshaped.cancelledOut} 张外协订单`)
  if (reshaped.purchaseReqNo) {
    parts.push(
      `已合并生成采购申请 ${reshaped.purchaseReqNo}（${reshaped.purchaseLineCount || 0} 条明细）`,
    )
  }
  if (reshaped.scheduled) {
    const other = reshaped.purchaseReqNo ? Math.max(0, reshaped.scheduled - 1) : reshaped.scheduled
    if (other > 0) parts.push(`已生成 ${other} 条新料工单/外协订单`)
  }
  if (!parts.length) parts.push(wholePlanMode.value ? '未勾选整单换 BOM' : '未选择处置动作')
  message.success(parts.join('，'))
}
</script>

<style lang="less" scoped>
.ecn-execute-page {
  margin: -12px;
  padding: 12px 12px 64px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.page-header {
  padding: 12px 4px 0;
  margin-bottom: 8px;
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
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.wip-hint {
  font-size: 13px;
  color: #595959;
  margin-bottom: 8px;
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
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  /* 与上方 section-card 同宽，不再左右撑满 */
  margin: 0;
  width: 100%;
  box-sizing: border-box;
}
</style>
