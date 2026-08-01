<template>
  <div class="inventory-deduct-detail-page">
    <div class="page-header">
      <div class="header-left">
        <template v-if="record">
          <span class="page-title">{{ record.deductNo }}</span>
          <span class="status-tag" :class="statusClass(record.status)">{{ record.status }}</span>
        </template>
        <span v-else class="page-title">扣减记录详情</span>
      </div>
      <a-space :size="8">
        <template v-if="record && actionKeys.length">
          <a-button v-if="actionKeys.includes('edit')" size="small" @click="openEdit"
            >编辑</a-button
          >
          <a-button
            v-if="actionKeys.includes('confirm')"
            type="primary"
            size="small"
            @click="onConfirm"
          >
            确认
          </a-button>
          <a-button v-if="actionKeys.includes('undoConfirm')" size="small" @click="onUndoConfirm">
            撤销确认
          </a-button>
          <a-button v-if="actionKeys.includes('retry')" size="small" @click="onRetry"
            >重试</a-button
          >
          <a-button v-if="actionKeys.includes('void')" danger size="small" @click="onVoid">
            作废
          </a-button>
        </template>
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <div class="page-body">
      <a-empty v-if="!record" description="扣减记录不存在或已删除" />

      <template v-else>
        <a-alert
          v-if="record.status === STATUS.PENDING"
          type="info"
          show-icon
          class="phase-alert"
          message="当前为预扣状态：系统已锁定对应库存，确认后将转为实扣。"
        />
        <a-alert
          v-else-if="locked"
          type="warning"
          show-icon
          class="phase-alert"
          message="确认已超过 30 天，单据已锁定，不可再撤销、作废或重试。"
        />
        <a-alert
          v-else-if="isConfirmedStatus"
          type="success"
          show-icon
          class="phase-alert"
          message="已确认实扣：库存已从预扣冻结转为正式扣减。"
        />
        <a-alert
          v-else-if="record.status === STATUS.VOIDED"
          type="warning"
          show-icon
          class="phase-alert"
          message="单据已作废：预扣已解冻退回，不可再重新发起。"
        />

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="工单/领料单号">
              {{ resolveInventoryDeductDocNo(record) || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="扣减单号">{{ record.deductNo }}</a-descriptions-item>
            <a-descriptions-item label="扣减状态">
              <span class="status-tag" :class="statusClass(record.status)">{{
                record.status
              }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="产品名称">{{
              record.productName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{
              record.productSpec || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="材质">{{ record.material || '—' }}</a-descriptions-item>
            <a-descriptions-item label="图号">{{ record.drawingNo || '—' }}</a-descriptions-item>
            <a-descriptions-item label="报工数量">{{ record.reportQty }}</a-descriptions-item>
            <a-descriptions-item label="扣减时间">{{
              record.deductTime || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="仓库">
              {{ record.warehouseName }} ({{ record.warehouseCode }})
            </a-descriptions-item>
            <a-descriptions-item label="物料行数">
              {{ record.materialDone }}/{{ record.materialTotal }}
            </a-descriptions-item>
            <a-descriptions-item v-if="record.voidReason" label="作废说明">
              {{ record.voidReason }}
            </a-descriptions-item>
            <a-descriptions-item v-if="record.revokeReason" label="撤销原因">
              {{ record.revokeReason }}
            </a-descriptions-item>
            <a-descriptions-item v-if="record.revokeRemark" label="撤销说明" :span="2">
              {{ record.revokeRemark }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">扣减明细（{{ record.lines?.length || 0 }}）</div>
          <a-table
            :columns="lineColumns"
            :data-source="record.lines || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1180 }"
            :locale="{ emptyText: '暂无扣减明细' }"
          >
            <template #bodyCell="{ column, record: line }">
              <template v-if="column.key === 'specModel'">
                {{ line.specModel || '—' }}
              </template>
              <template v-else-if="column.key === 'material'">
                {{ line.material || '—' }}
              </template>
              <template v-else-if="column.key === 'drawingNo'">
                {{ line.drawingNo || '—' }}
              </template>
              <template v-else-if="column.key === 'variantAttr'">
                {{ lineVariantText(line) || '—' }}
              </template>
              <template v-else-if="column.key === 'status'">
                <span class="status-tag sm" :class="statusClass(line.status)">{{
                  line.status
                }}</span>
              </template>
              <template v-else-if="column.key === 'failReason'">
                {{ line.failReason || '—' }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </div>

    <InventoryDeductEditModal v-model:open="editOpen" :record="record" @saved="onSaved" />
  </div>
</template>

<script>
export default { name: 'InventoryDeductDetailView' }
</script>

<script setup>
import { computed, createVNode, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import {
  MATERIAL_DEDUCT_STATUS,
  resolveInventoryDeductDocNo,
  isQuickMaterialDeduct,
} from '@/mock/materialRequisitionRecords'
import {
  getMaterialDeductById,
  confirmMaterialDeduct,
  undoConfirmMaterialDeduct,
  voidMaterialDeduct,
  retryMaterialDeduct,
  isMaterialDeductLocked,
} from '@/store/materialRequisitionStore'
import { lineVariantSummary } from '@/utils/spuLineResolve'
import InventoryDeductEditModal from './components/InventoryDeductEditModal.vue'

const route = useRoute()
const router = useRouter()
const STATUS = MATERIAL_DEDUCT_STATUS
const editOpen = ref(false)
const tick = ref(0)

const record = computed(() => {
  tick.value
  return getMaterialDeductById(String(route.params.id || ''))
})

const lineColumns = [
  { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 110 },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName', width: 120 },
  { title: '规格型号', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', width: 90, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 110, ellipsis: true },
  { title: '变体属性', key: 'variantAttr', width: 140, ellipsis: true },
  { title: '应扣', dataIndex: 'planQty', key: 'planQty', width: 70, align: 'right' },
  { title: '实扣', dataIndex: 'actualQty', key: 'actualQty', width: 70, align: 'right' },
  { title: '状态', key: 'status', width: 80 },
  { title: '失败原因', key: 'failReason', width: 120, ellipsis: true },
]

const isConfirmedStatus = computed(() => {
  const s = record.value?.status
  return s === STATUS.SUCCESS || s === STATUS.PARTIAL || s === STATUS.FAILED
})

const locked = computed(() => isMaterialDeductLocked(record.value))

const actionKeys = computed(() => {
  const s = record.value?.status
  if (!s || s === STATUS.VOIDED || locked.value) return []
  if (s === STATUS.PENDING) return ['edit', 'confirm', 'void']
  if (s === STATUS.SUCCESS) return ['undoConfirm', 'void']
  if (s === STATUS.PARTIAL || s === STATUS.FAILED) return ['undoConfirm', 'retry', 'void']
  return []
})

function refresh() {
  tick.value += 1
}

function lineVariantText(line) {
  return lineVariantSummary(line) || line.variantSummary || ''
}

function statusClass(status) {
  const map = {
    [STATUS.SUCCESS]: 'is-success',
    [STATUS.FAILED]: 'is-failed',
    [STATUS.PARTIAL]: 'is-partial',
    [STATUS.VOIDED]: 'is-voided',
    [STATUS.PENDING]: 'is-pending',
  }
  return map[status] || ''
}

function goBack() {
  router.push('/inventory/deduct-records')
}

function openEdit() {
  editOpen.value = true
}

function onSaved() {
  refresh()
}

function onConfirm() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: '确认扣减？',
    content: `确认通过${isQuickMaterialDeduct(row) ? '领料单' : '工单'} ${resolveInventoryDeductDocNo(row)} 的库存扣减？通过后将按物料执行扣减。`,
    okText: '确认',
    cancelText: '取消',
    onOk() {
      const res = confirmMaterialDeduct(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(`已确认，状态：${res.record.status}`)
      refresh()
    },
  })
}

function onUndoConfirm() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: '撤销确认？',
    content:
      '撤销确认后，已实扣的库存将退回至扣减仓库，单据恢复为「待确认」，预扣锁定继续保留。是否继续？',
    okText: '撤销确认',
    cancelText: '取消',
    onOk() {
      const res = undoConfirmMaterialDeduct(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已撤销确认，单据已恢复为待确认')
      refresh()
    },
  })
}

function onVoid() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: '确认作废？',
    icon: createVNode(ExclamationCircleOutlined, { style: { color: '#ff4d4f' } }),
    content: createVNode('div', { class: 'void-confirm-content' }, [
      createVNode(
        'p',
        { style: { color: '#cf1322', marginBottom: '8px', fontWeight: 600 } },
        '作废后不可恢复',
      ),
      createVNode(
        'p',
        { style: { color: '#cf1322', marginBottom: 0 } },
        `${isQuickMaterialDeduct(row) ? '领料单' : '工单'} ${resolveInventoryDeductDocNo(row)} 的扣减单作废后将永久失效：预扣库存解冻退回，且不可再重新发起。如需再次扣减，请联系仓管员另行处理。`,
      ),
    ]),
    okText: '确认作废',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const res = voidMaterialDeduct(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('单据已作废')
      refresh()
    },
  })
}

function onRetry() {
  const row = record.value
  if (!row) return
  const res = retryMaterialDeduct(row.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已重试，状态：${res.record.status}`)
  refresh()
}
</script>

<style lang="less" scoped>
.inventory-deduct-detail-page {
  margin: -12px;
  height: calc(100vh - 56px - 40px - 24px);
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  z-index: 30;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.phase-alert {
  margin-bottom: 12px;
}

.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.status-tag {
  display: inline-block;
  padding: 0 8px;
  height: 22px;
  line-height: 20px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid transparent;

  &.sm {
    height: 20px;
    line-height: 18px;
    padding: 0 6px;
  }

  &.is-success {
    color: #fff;
    background: #52c41a;
  }
  &.is-failed {
    color: #fff;
    background: #ff4d4f;
  }
  &.is-partial {
    color: #fff;
    background: #fa8c16;
  }
  &.is-voided {
    color: #fff;
    background: #8c8c8c;
  }
  &.is-pending {
    color: #d46b08;
    background: #fff7e6;
    border-color: #ffd591;
  }
}
</style>
