<template>
  <div class="section-block">
    <div class="section-title-row">
      <div class="section-title">
        {{ title }}
        <a-tooltip :title="titleTip">
          <QuestionCircleOutlined class="th-tip-icon" />
        </a-tooltip>
      </div>
      <a-space :size="8">
        <a-button
          v-if="showBringStandardKit"
          size="small"
          :disabled="disabled"
          @click="rebuildFromCurrentDelivery({ merge: true })"
        >
          带出标准包
        </a-button>
        <a-button size="small" :disabled="disabled" @click="openAddFromShipBom">
          从随货附件添加
        </a-button>
        <a-button
          type="primary"
          size="small"
          :disabled="disabled"
          @click="attachmentPickerOpen = true"
        >
          手工添加
        </a-button>
      </a-space>
    </div>
    <a-divider class="section-divider" />

    <a-alert
      v-if="!hideInnerAlert && shipAttachmentProductSummaries.length"
      type="info"
      show-icon
      class="ship-att-alert"
      :message="shipAttachmentAlertMessage"
    />

    <a-empty v-if="!shipAttachmentProductSummaries.length" :description="emptyDescription" />

    <a-collapse
      v-else
      v-model:active-key="attachmentActiveKey"
      :accordion="!expandAllByDefault"
      class="ship-att-collapse"
    >
      <a-collapse-panel
        v-for="group in shipAttachmentProductSummaries"
        :key="group.key"
        :header="attachmentGroupHeader(group)"
      >
        <template #extra>
          <a-space :size="8" @click.stop>
            <span class="ship-att-sets-label">
              已选套数：{{ attachmentGroupKitSets(group) }}/{{ attachmentGroupOrderSets(group) }}
            </span>
            <a-input-number
              size="small"
              :min="0"
              :precision="0"
              :value="attachmentGroupKitSets(group)"
              style="width: 88px"
              :disabled="disabled || group.key === '__unlinked__'"
              @change="(val) => onAttachmentGroupKitSetsChange(group, val)"
            />
            <a-button
              type="link"
              size="small"
              :disabled="disabled"
              @click="setProductAttachmentsSelected(group, true)"
            >
              全部纳入
            </a-button>
            <a-button
              type="link"
              size="small"
              :disabled="disabled"
              @click="setProductAttachmentsSelected(group, false)"
            >
              全部不纳入
            </a-button>
          </a-space>
        </template>

        <a-table
          :columns="shipAttachmentColumns"
          :data-source="attachmentsOfGroup(group)"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: tableScrollX }"
        >
          <template #headerCell="{ column }">
            <template v-if="column.key === 'shipProgress'">
              <span>
                发货进度
                <a-tooltip title="已发货数量 / 已申请数量 / 计划数量（订单套数×单位用量）">
                  <QuestionCircleOutlined class="th-tip-icon" />
                </a-tooltip>
              </span>
            </template>
            <template v-else-if="column.key === 'selected'">
              <span>
                纳入本单
                <a-tooltip
                  title="勾选后保存，会写入本发货单对应的同一张销售出库单；未勾选不随本票出库。"
                >
                  <QuestionCircleOutlined class="th-tip-icon" />
                </a-tooltip>
              </span>
            </template>
            <template v-else-if="column.key === 'outboundStatus'">
              <span>
                出库单
                <a-tooltip
                  title="已写入：已在关联销售出库单明细中。待写入：已勾选，保存后才会写入。不纳入：未勾选。"
                >
                  <QuestionCircleOutlined class="th-tip-icon" />
                </a-tooltip>
              </span>
            </template>
            <template v-else>{{ column.title }}</template>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'index'">
              {{ attachmentsOfGroup(group).indexOf(record) + 1 }}
            </template>
            <template v-else-if="column.key === 'selected'">
              <a-checkbox
                :checked="record.selected !== false"
                :disabled="disabled"
                @change="(e) => (record.selected = e.target.checked)"
              />
            </template>
            <template v-else-if="column.key === 'outboundStatus'">
              <a-tag :color="outboundStatusOf(record).color">
                {{ outboundStatusOf(record).text }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'shipStatus'">
              <a-tag :color="attachmentShipStatusColor(record.shipStatus)">
                {{ record.shipStatus || '未发货' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'shipProgress'">
              {{
                formatAttachmentShipProgress(record.shippedQty, record.appliedQty, record.planQty)
              }}
            </template>
            <template v-else-if="column.key === 'source'">
              <a-tag :color="record.source === 'BOM' ? 'blue' : 'default'">
                {{ record.source || '手工' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'productName'">
              <a-select
                v-if="record.source === '手工'"
                :value="record.productId || ''"
                size="small"
                allow-clear
                show-search
                option-filter-prop="label"
                placeholder="不关联"
                style="width: 100%"
                :options="shipAttachmentProductOpts"
                :disabled="disabled"
                @change="(val) => onManualAttachmentProductChange(record, val)"
              />
              <template v-else>
                {{ record.productName || '—' }}
                <span v-if="record.productCode" class="ship-att-line-code">
                  （{{ record.productCode }}）
                </span>
              </template>
            </template>
            <template v-else-if="column.key === 'unitQty'">
              {{ formatDeliveryQty(record.unitQty) }}
            </template>
            <template v-else-if="column.key === 'kitSets'">
              <a-input-number
                v-model:value="record.kitSets"
                size="small"
                :min="0"
                :precision="0"
                style="width: 100%"
                :disabled="disabled || record.selected === false"
                @change="() => onAttachmentRowKitSetsChange(record)"
              />
            </template>
            <template v-else-if="column.key === 'shipQty'">
              <a-input-number
                v-model:value="record.shipQty"
                size="small"
                :min="0"
                :precision="4"
                style="width: 100%"
                :disabled="disabled || record.selected === false"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                :disabled="disabled"
                @click="removeShipAttachment(record)"
              >
                删除
              </a-button>
            </template>
            <template v-else>{{ record[column.dataIndex] || '—' }}</template>
          </template>
        </a-table>
      </a-collapse-panel>
    </a-collapse>
  </div>

  <SelectBomMaterialModal
    v-model:open="attachmentPickerOpen"
    :multiple="true"
    :include-spu-templates="false"
    @selected="onAttachmentMaterialsPicked"
  />

  <a-modal
    v-model:open="shipBomAddOpen"
    title="从随货附件添加"
    ok-text="添加"
    destroy-on-close
    @ok="confirmAddFromShipBom"
  >
    <a-form layout="vertical" class="ship-bom-add-form">
      <a-form-item label="产品" required>
        <a-select
          v-model:value="shipBomAddForm.productKey"
          placeholder="请选择本单产品"
          show-search
          option-filter-prop="label"
          :options="shipBomAddProductOpts"
        />
      </a-form-item>
      <a-form-item label="添加套数" required>
        <a-input-number
          v-model:value="shipBomAddForm.addSets"
          :min="1"
          :precision="0"
          style="width: 100%"
          placeholder="支持多于订单套数（赠送）"
        />
      </a-form-item>
      <a-alert
        type="info"
        show-icon
        message="可多次添加。添加套数可大于订单套数，用于随机多赠送等场景；本次发运 = 套数 × 单位用量。"
      />
    </a-form>
  </a-modal>
</template>

<script>
export default { name: 'DeliveryShipAttachmentSection' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { formatDeliveryQty, isDeliveryLineShipLocked } from '@/utils/deliveryLine'
import {
  collectShipAttachmentsFromSalesLines,
  createShipAttachmentLine,
  mergeShipAttachmentLists,
  productHasShipBom,
  summarizeShipAttachmentsByProduct,
  enrichShipAttachmentsWithShipStatus,
  attachmentShipStatusColor,
  formatAttachmentShipProgress,
  applyKitSetsToAttachmentGroup,
  calcAttachmentShipQtyBySets,
  addShipBomAttachmentSets,
} from '@/utils/shipBomAttachments'
import { getActiveShipBomForProduct } from '@/store/productBomStore'
import { outboundState } from '@/store/outboundStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  lineItems: { type: Array, default: () => [] },
  scatterShipments: { type: Array, default: () => [] },
  salesOrder: { type: Object, default: null },
  salesOrderId: { type: String, default: '' },
  warehouse: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  showBringStandardKit: { type: Boolean, default: false },
  title: { type: String, default: '发货附件' },
  titleTip: {
    type: String,
    default:
      '勾选「纳入本单」即本票执行清单。套数展示为「已选择套数/订单套数」；可通过「从随货附件添加」多次累加套数（可大于订单套数，用于赠送）。',
  },
  hideInnerAlert: { type: Boolean, default: false },
  hideProductSourceColumns: { type: Boolean, default: false },
  showOutboundStatus: { type: Boolean, default: false },
  delivery: { type: Object, default: null },
  expandAllByDefault: { type: Boolean, default: false },
  emptyDescription: {
    type: String,
    default: '暂无发货附件（选择销售订单后，有随货附件的产品会按产品分组列出）',
  },
})

const attachments = defineModel({ type: Array, default: () => [] })

const attachmentPickerOpen = ref(false)
const shipBomAddOpen = ref(false)
const shipBomAddForm = reactive({
  productKey: undefined,
  addSets: 1,
})
const attachmentActiveKey = ref(props.expandAllByDefault ? [] : '')

const shipAttachmentColumns = computed(() => {
  const cols = [
    { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
    { title: '纳入本单', key: 'selected', width: 100, align: 'center', fixed: 'left' },
  ]
  if (props.showOutboundStatus) {
    cols.push({ title: '出库单', key: 'outboundStatus', width: 88, align: 'center', fixed: 'left' })
  }
  cols.push({ title: '发货状态', key: 'shipStatus', width: 88, align: 'center' })
  cols.push({ title: '发货进度', key: 'shipProgress', width: 140, align: 'right' })
  if (!props.hideProductSourceColumns) {
    cols.push({
      title: '关联产品',
      key: 'productName',
      dataIndex: 'productName',
      width: 180,
      ellipsis: true,
    })
    cols.push({ title: '来源', key: 'source', width: 72 })
  }
  cols.push(
    { title: '物料编码', dataIndex: 'materialCode', width: 120, ellipsis: true },
    { title: '物料名称', dataIndex: 'materialName', width: 140, ellipsis: true },
    { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
    { title: '单位', dataIndex: 'unit', width: 56 },
    { title: '单位用量', key: 'unitQty', width: 88, align: 'right' },
    { title: '发货套数', key: 'kitSets', width: 100 },
    { title: '本次发运', key: 'shipQty', width: 110 },
    { title: '操作', key: 'action', width: 72, align: 'center' },
  )
  return cols
})

const tableScrollX = computed(() => {
  return shipAttachmentColumns.value.reduce((s, c) => s + (Number(c.width) || 120), 0)
})

function outboundStatusOf(record) {
  void outboundState.orders
  const selected = record?.selected !== false
  if (!selected) return { text: '不纳入', color: 'default' }
  const ob = findLinkedSalesOutbound(props.delivery)
  if (!ob) return { text: '待写入', color: 'warning' }
  const code = String(record.materialCode || '').trim()
  const hit = (ob.lineItems || []).some((l) => String(l.itemCode || '').trim() === code)
  if (hit) {
    return ob.status === '已出库'
      ? { text: '已出库', color: 'success' }
      : { text: '已写入', color: 'success' }
  }
  return { text: '待写入', color: 'warning' }
}

const shipAttachmentProductSummaries = computed(() =>
  summarizeShipAttachmentsByProduct(attachments.value),
)

function allGroupKeys() {
  return shipAttachmentProductSummaries.value.map((g) => g.key)
}

function activateGroups(preferredKey) {
  const keys = allGroupKeys()
  if (props.expandAllByDefault) {
    attachmentActiveKey.value = keys
    return
  }
  if (preferredKey && keys.includes(preferredKey)) {
    attachmentActiveKey.value = preferredKey
    return
  }
  attachmentActiveKey.value = keys[0] || ''
}

watch(
  () => allGroupKeys().join('|'),
  () => {
    if (!props.expandAllByDefault) return
    const keys = allGroupKeys()
    const cur = Array.isArray(attachmentActiveKey.value) ? attachmentActiveKey.value : []
    if (!cur.length && keys.length) attachmentActiveKey.value = keys
  },
  { immediate: true },
)

const shipAttachmentProductOpts = computed(() => {
  const map = new Map()
  const push = (line) => {
    if (!line) return
    const id = String(line.productId || line.itemId || line.salesLineId || line.id || '')
    if (!id || map.has(id)) return
    const code = line.productCode || line.itemCode || ''
    const name = line.productName || line.itemName || ''
    map.set(id, {
      value: id,
      label: [name, code].filter(Boolean).join(' / ') || id,
      productId: line.productId || line.itemId || id,
      productCode: code,
      productName: name,
      salesLineId: line.salesLineId || line.id || '',
    })
  }
  ;(props.lineItems || []).forEach(push)
  ;(props.scatterShipments || []).forEach(push)
  return [{ value: '', label: '不关联' }, ...Array.from(map.values())]
})

const shipAttachmentAlertMessage = computed(() => {
  const groups = shipAttachmentProductSummaries.value
  if (!groups.length) return ''
  const names = groups.map((g) => g.productName).filter(Boolean)
  const picked = groups.reduce((s, g) => s + g.selectedCount, 0)
  const total = groups.reduce((s, g) => s + g.total, 0)
  const done = (attachments.value || []).filter((r) => r.shipStatus === '已发完').length
  const doneHint = done ? `其中 ${done} 项历史已发完，后续发货可不勾选。` : ''
  return `本单 ${groups.length} 组发货附件（${names.join('、')}），共 ${total} 项；已纳入 ${picked} 项。${doneHint}仅展示本单整机/散件产品的附件，请按产品填写发货套数并勾选是否随货发出。`
})

function currentDeliveryLinesForAttachments() {
  const lines = []
  const push = (row) => {
    if (!row) return
    if (isDeliveryLineShipLocked(row)) return
    const productId = row.productId || row.itemId
    const productCode = row.productCode || row.itemCode || ''
    if (!productId && !productCode) return
    lines.push({
      id: row.salesLineId || row.id,
      productId,
      productCode,
      productName: row.productName || row.itemName || '',
      salesQty: row.orderQty ?? row.salesQty ?? row.qty,
      qty: row.orderQty ?? row.salesQty ?? row.qty,
      orderQty: row.orderQty,
    })
  }
  ;(props.lineItems || []).forEach(push)
  ;(props.scatterShipments || []).forEach(push)
  return lines
}

const shipBomAddProductOpts = computed(() => {
  return currentDeliveryLinesForAttachments()
    .filter((line) => productHasShipBom(line.productId))
    .map((line) => {
      const key = String(line.id || line.productId || line.productCode)
      const label = [line.productName, line.productCode].filter(Boolean).join(' / ') || key
      return {
        value: key,
        label,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        salesLineId: line.id || '',
        orderSets: Number(line.orderQty ?? line.salesQty ?? line.qty) || 0,
      }
    })
})

function attachmentGroupHeader(group) {
  if (group.key === '__unlinked__') {
    const totalPcs = attachmentGroupTotalPieces(group)
    return `${group.productName} · 附件 ${group.total} 项 · 已纳入 ${group.selectedCount}/${group.total} 共计：${formatDeliveryQty(totalPcs)} 件`
  }
  const selected = attachmentGroupKitSets(group)
  const orderSets = attachmentGroupOrderSets(group)
  const totalPcs = attachmentGroupTotalPieces(group)
  return `${group.productName}${group.productCode ? `（${group.productCode}）` : ''} · 附件 ${group.total} 项 · 已选套数：${selected}/${orderSets} · 已纳入 ${group.selectedCount}/${group.total} 共计：${formatDeliveryQty(totalPcs)} 件`
}

function attachmentGroupTotalPieces(group) {
  return attachmentsOfGroup(group)
    .filter((r) => r.selected !== false)
    .reduce((s, r) => s + (Number(r.shipQty) || 0), 0)
}

function attachmentsOfGroup(group) {
  if (!group) return []
  const pid = String(group.productId || '')
  const code = String(group.productCode || '')
  const name = String(group.productName || '')
  const unlinked = group.key === '__unlinked__' || name === '不关联'
  return (attachments.value || []).filter((row) => {
    const rowUnlinked = !row.productId && !row.productCode && !row.productName
    if (unlinked) return rowUnlinked
    return (
      (pid && String(row.productId) === pid) ||
      (!pid && code && row.productCode === code) ||
      (!pid && !code && row.productName === name)
    )
  })
}

function attachmentGroupKitSets(group) {
  const rows = attachmentsOfGroup(group)
  const withSets = rows.find((r) => r.kitSets != null)
  if (withSets) return Number(withSets.kitSets) || 0
  return group?.kitSets != null ? Number(group.kitSets) : 0
}

function attachmentGroupOrderSets(group) {
  const so = props.salesOrder
  const line =
    (so?.lineItems || []).find((l) => String(l.id) === String(group.salesLineId)) ||
    (so?.lineItems || []).find(
      (l) =>
        String(l.productId || l.itemId) === String(group.productId) ||
        (group.productCode && (l.productCode || l.itemCode) === group.productCode),
    )
  if (line) return Number(line.salesQty ?? line.qty ?? line.orderQty) || 0

  const whole = (props.lineItems || []).find(
    (l) =>
      String(l.productId || l.itemId) === String(group.productId) ||
      l.salesLineId === group.salesLineId ||
      (group.productCode && (l.productCode || l.itemCode) === group.productCode),
  )
  const scatter = (props.scatterShipments || []).find(
    (l) =>
      String(l.productId || l.itemId) === String(group.productId) ||
      l.salesLineId === group.salesLineId ||
      (group.productCode && (l.productCode || l.itemCode) === group.productCode),
  )
  const local = whole || scatter
  return Number(local?.orderQty) || 0
}

function onAttachmentGroupKitSetsChange(group, val) {
  const sets = Math.max(0, Number(val) || 0)
  attachments.value = applyKitSetsToAttachmentGroup(attachments.value, group.key, sets)
}

function onAttachmentRowKitSetsChange(record) {
  if (!record) return
  const unitQty = Number(record.unitQty) || 1
  record.shipQty = calcAttachmentShipQtyBySets(unitQty, record.kitSets)
}

function removeShipAttachment(record) {
  const idx = (attachments.value || []).findIndex((r) => r.id === record.id)
  if (idx !== -1) attachments.value.splice(idx, 1)
}

function syncKitSetsFromWholeLines() {
  const so = props.salesOrder
  ;(props.lineItems || []).forEach((line) => {
    if (isDeliveryLineShipLocked(line)) return
    const pid = String(line.productId || line.itemId || '')
    const key = pid || String(line.productCode || line.productName || '')
    if (!key) return
    const hasAtt = (attachments.value || []).some(
      (a) =>
        (pid && String(a.productId) === pid) ||
        (line.salesLineId && a.salesLineId === line.salesLineId) ||
        (line.id && a.salesLineId === line.id),
    )
    if (!hasAtt) return
    const groupKey = pid || String(line.productCode || line.productName)
    const sets = Number(line.shipQty) || 0
    attachments.value = applyKitSetsToAttachmentGroup(attachments.value, groupKey, sets)
  })
  if (so) refreshAttachmentShipStatus(true)
}

function refreshAttachmentShipStatus(preserveShipQty = false) {
  attachments.value = enrichShipAttachmentsWithShipStatus(attachments.value, props.salesOrder, {
    preserveShipQty,
  })
}

function onManualAttachmentProductChange(record, productKey) {
  if (!record) return
  const key = productKey == null ? '' : String(productKey)
  if (!key) {
    record.productId = ''
    record.productCode = ''
    record.productName = ''
    record.salesLineId = ''
    refreshAttachmentShipStatus(true)
    return
  }
  const opt = shipAttachmentProductOpts.value.find((o) => String(o.value) === key)
  if (!opt || opt.value === '') {
    record.productId = ''
    record.productCode = ''
    record.productName = ''
    record.salesLineId = ''
    refreshAttachmentShipStatus(true)
    return
  }
  record.productId = opt.productId || ''
  record.productCode = opt.productCode || ''
  record.productName = opt.productName || ''
  record.salesLineId = opt.salesLineId || ''
  refreshAttachmentShipStatus(true)
}

function setProductAttachmentsSelected(group, selected) {
  if (!group) return
  const pid = String(group.productId || '')
  const code = String(group.productCode || '')
  const name = String(group.productName || '')
  const unlinked = group.key === '__unlinked__' || name === '不关联'
  ;(attachments.value || []).forEach((row) => {
    const rowUnlinked = !row.productId && !row.productCode && !row.productName
    const match = unlinked
      ? rowUnlinked
      : (pid && String(row.productId) === pid) ||
        (!pid && code && row.productCode === code) ||
        (!pid && !code && row.productName === name)
    if (match) row.selected = selected
  })
}

function isAttachmentOnCurrentDelivery(att) {
  if (!att) return false
  if (!att.productId && !att.productCode && !att.productName && !att.salesLineId) return true
  const lines = currentDeliveryLinesForAttachments()
  return lines.some((line) => {
    if (att.salesLineId && (att.salesLineId === line.id || att.salesLineId === line.salesLineId)) {
      return true
    }
    if (att.productId && String(att.productId) === String(line.productId)) return true
    if (att.productCode && att.productCode === line.productCode) return true
    return false
  })
}

function pruneToCurrentDelivery() {
  attachments.value = (attachments.value || []).filter(isAttachmentOnCurrentDelivery)
  const keys = allGroupKeys()
  if (props.expandAllByDefault) {
    const cur = Array.isArray(attachmentActiveKey.value) ? attachmentActiveKey.value : []
    const keep = cur.filter((k) => keys.includes(k))
    attachmentActiveKey.value = keep.length ? keep : keys
    return
  }
  if (attachmentActiveKey.value && !keys.includes(attachmentActiveKey.value)) {
    attachmentActiveKey.value = keys[0] || ''
  }
}

function rebuildFromCurrentDelivery({ merge = false } = {}) {
  const so = props.salesOrder
  const fromBom = enrichShipAttachmentsWithShipStatus(
    collectShipAttachmentsFromSalesLines(currentDeliveryLinesForAttachments(), {
      warehouse: props.warehouse,
    }),
    so,
  )
  if (merge) {
    attachments.value = enrichShipAttachmentsWithShipStatus(
      mergeShipAttachmentLists(fromBom, attachments.value),
      so,
      { preserveShipQty: true },
    )
  } else {
    attachments.value = fromBom
  }
  pruneToCurrentDelivery()
  syncKitSetsFromWholeLines()
  activateGroups()
}

function openAddFromShipBom() {
  if (!props.salesOrderId) {
    message.warning('请先选择销售订单')
    return
  }
  if (!shipBomAddProductOpts.value.length) {
    message.warning('本单产品均无生效随货附件，请先配置或使用手工添加')
    return
  }
  shipBomAddForm.productKey = shipBomAddProductOpts.value[0]?.value
  shipBomAddForm.addSets = 1
  shipBomAddOpen.value = true
}

function confirmAddFromShipBom() {
  const opt = shipBomAddProductOpts.value.find((o) => o.value === shipBomAddForm.productKey)
  if (!opt) {
    message.warning('请选择产品')
    return Promise.reject()
  }
  const addSets = Math.max(1, Number(shipBomAddForm.addSets) || 0)
  if (!addSets) {
    message.warning('请填写添加套数')
    return Promise.reject()
  }
  const shipBom = getActiveShipBomForProduct(opt.productId)
  if (!shipBom) {
    message.warning(`产品「${opt.productName}」无生效随货附件`)
    return Promise.reject()
  }
  attachments.value = enrichShipAttachmentsWithShipStatus(
    addShipBomAttachmentSets(attachments.value, shipBom, {
      addSets,
      productId: opt.productId,
      productCode: opt.productCode,
      productName: opt.productName,
      salesLineId: opt.salesLineId,
      orderSets: opt.orderSets || addSets,
      warehouse: props.warehouse,
    }),
    props.salesOrder,
    { preserveShipQty: true },
  )
  const groupKey = String(opt.productId || opt.productCode || opt.productName)
  activateGroups(groupKey)
  shipBomAddOpen.value = false
  const curSets =
    (attachments.value || []).find(
      (r) =>
        (opt.productId && String(r.productId) === String(opt.productId)) ||
        (opt.productCode && r.productCode === opt.productCode),
    )?.kitSets ?? addSets
  message.success(
    `已为「${opt.productName}」添加 ${addSets} 套随货附件（当前套数：${curSets}/${opt.orderSets}）`,
  )
}

function onAttachmentMaterialsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  list.forEach((item) => {
    const code = item.code || item.itemCode || ''
    if (!code) return
    const exists = (attachments.value || []).find(
      (r) => r.materialCode === code && r.source === '手工' && !r.salesLineId,
    )
    if (exists) {
      exists.shipQty = (Number(exists.shipQty) || 0) + 1
      return
    }
    attachments.value.push(
      createShipAttachmentLine({
        materialCode: code,
        materialName: item.name || item.itemName || '',
        specModel: item.specModel || item.spec || '',
        material: item.material || '',
        drawingNo: item.drawingNo || '',
        unit: item.unit || item.inventoryUnit || '件',
        shipQty: 1,
        source: '手工',
        productId: '',
        productCode: '',
        productName: '',
        salesLineId: '',
        warehouse: props.warehouse,
        selected: true,
      }),
    )
  })
}

function validate() {
  for (const group of shipAttachmentProductSummaries.value) {
    if (group.key === '__unlinked__') continue
    const sets = attachmentGroupKitSets(group)
    const selected = attachmentsOfGroup(group).filter((r) => r.selected !== false)
    if (selected.length && sets <= 0) {
      message.warning(
        `产品「${group.productName}」已纳入附件，请填写发货套数（可为赠送多于订单套数）`,
      )
      return false
    }
  }
  return true
}

function lineHasHint(record) {
  const productId = record?.productId || record?.itemId
  if (productId && productHasShipBom(productId)) return true
  const pid = String(productId || '')
  const code = String(record?.productCode || '')
  return (attachments.value || []).some(
    (a) =>
      (pid && String(a.productId) === pid) ||
      (code && a.productCode === code) ||
      (record?.id && a.salesLineId === record.id) ||
      (record?.salesLineId && a.salesLineId === record.salesLineId),
  )
}

defineExpose({
  rebuildFromCurrentDelivery,
  pruneToCurrentDelivery,
  syncKitSetsFromWholeLines,
  validate,
  lineHasHint,
})
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.th-tip-icon {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
}

.ship-att-alert {
  margin-bottom: 10px;
}

.ship-att-collapse {
  margin-bottom: 8px;

  :deep(.ant-collapse-header) {
    align-items: center !important;
  }

  :deep(.ant-collapse-extra) {
    margin-left: 12px;
  }
}

.ship-att-sets-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.ship-bom-add-form {
  margin-top: 8px;
}

.ship-att-line-code {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.section-divider {
  margin: 8px 0 12px;
}

:deep(.ant-table-cell) {
  .ant-input-number {
    width: 100%;
  }
}
</style>
