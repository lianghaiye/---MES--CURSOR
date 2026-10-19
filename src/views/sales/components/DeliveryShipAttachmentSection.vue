<template>
  <div class="section-block">
    <div class="section-title-row">
      <div class="section-title">
        {{ title }}
        <a-tooltip :title="resolvedTitleTip">
          <QuestionCircleOutlined class="th-tip-icon" />
        </a-tooltip>
      </div>
      <a-space v-if="allowComposeList" :size="8">
        <a-button size="small" :disabled="disabled" @click="openAddPackage">
          从随货配件添加
        </a-button>
        <a-button
          type="primary"
          size="small"
          :disabled="disabled"
          @click="attachmentPickerOpen = true"
        >
          从主数据添加
        </a-button>
      </a-space>
    </div>
    <a-divider class="section-divider" />

    <a-empty
      v-if="!shipAttachmentProductSummaries.length"
      class="ship-att-empty"
      :description="resolvedEmptyDescription"
    />

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
          :row-class-name="attachmentRowClassName"
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
            <template v-else-if="column.key === 'availableStock'">
              <span>
                可用库存
                <a-tooltip title="按本单出库仓库统计，未选出库仓库时为空。">
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
            <template v-else-if="column.key === 'availableStock'">
              {{ formatDeliveryQty(record.availableStock ?? record.warehouseStockQty) }}
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
                v-if="allowComposeList"
                type="link"
                size="small"
                danger
                :disabled="disabled"
                @click="removeShipAttachment(record)"
              >
                删除
              </a-button>
              <span v-else>—</span>
            </template>
            <template v-else>{{ record[column.dataIndex] || '—' }}</template>
          </template>
        </a-table>
      </a-collapse-panel>
    </a-collapse>
  </div>

  <SelectBomMaterialModal
    v-model:open="attachmentPickerOpen"
    title="添加配件（建议选择类型为「配件」的物料/产品）"
    picker-default-item-type="配件"
    hide-add-material
    :multiple="true"
    :include-spu-templates="false"
    @selected="onAttachmentMaterialsPicked"
  />

  <a-modal
    v-model:open="packageOpen"
    title="从随货配件添加"
    width="1480px"
    :mask-closable="false"
    destroy-on-close
    class="select-ship-package-modal"
    ok-text="添加"
    :ok-button-props="{ disabled: !packageForm.bomId }"
    @ok="confirmAddPackage"
  >
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form package-filter-form">
        <ListFilterBar
          :field-count="2"
          search-text="搜索"
          reset-text="清空"
          @search="searchPackageList"
          @reset="resetPackageFilters"
        >
          <a-form-item label="配件包名称">
            <a-input
              v-model:value="packageFilters.bomName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="searchPackageList"
            />
          </a-form-item>
          <a-form-item label="编号">
            <a-input
              v-model:value="packageFilters.bomNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="searchPackageList"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
    </div>
    <div class="package-settings">
      <div class="package-settings-item">
        <span class="package-settings-label">归属产品：</span>
        <a-select
          v-model:value="packageForm.productKey"
          show-search
          allow-clear
          size="small"
          option-filter-prop="label"
          placeholder="可不选"
          class="package-product-select"
          :options="shipAttachmentProductOpts"
        />
      </div>
      <div class="package-settings-item">
        <span class="package-settings-label required">套数：</span>
        <a-input-number
          v-model:value="packageForm.kitSets"
          size="small"
          :min="1"
          :precision="0"
          class="package-sets-input"
        />
      </div>
    </div>
    <div class="picker-body">
      <div class="table-panel">
        <div class="table-frame">
          <a-table
            class="package-pick-table"
            :columns="packageColumns"
            :data-source="pagedPackageRows"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :row-selection="packageRowSelection"
            :custom-row="packageCustomRow"
            :scroll="{ x: 860, y: 360 }"
            :locale="{ emptyText: '暂无已启用的随货配件包' }"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'index'">
                {{ (packagePage.current - 1) * packagePage.pageSize + index + 1 }}
              </template>
            </template>
          </a-table>
        </div>
        <div class="table-pager">
          <a-pagination
            v-model:current="packagePage.current"
            v-model:page-size="packagePage.pageSize"
            size="small"
            :total="filteredPackageRows.length"
            show-size-changer
            :page-size-options="['8', '10', '20']"
            :show-total="(total) => `共 ${total} 条`"
          />
        </div>
      </div>
      <div class="selected-panel">
        <div class="selected-head">
          <span class="selected-title">已选 {{ selectedPackage ? 1 : 0 }} 项</span>
          <a-button
            v-if="selectedPackage"
            type="link"
            size="small"
            class="clear-btn"
            @click="clearPackageSelection"
          >
            清空
          </a-button>
        </div>
        <div v-if="selectedPackage" class="selected-list">
          <div class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ selectedPackage.bomNo || '—' }}</span>
              <span class="selected-name" :title="selectedPackage.bomName">
                {{ selectedPackage.bomName || selectedPackage.itemName || '未命名配件包' }}
              </span>
            </div>
            <a-button type="text" size="small" class="remove-btn" @click="clearPackageSelection">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'DeliveryShipAttachmentSection' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
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
  buildShipAttachmentsFromBom,
} from '@/utils/shipBomAttachments'
import { getProductBomById, listActiveSharedShipBoms } from '@/store/productBomStore'
import { enrichShipAccessoryStock } from '@/utils/salesOrderShipAccessories'
import { outboundState } from '@/store/outboundStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import { functionParamState, isShipAttachmentDecidedAtOrder } from '@/store/functionParamStore'
import { cloneOrderShipAccessoriesForDelivery } from '@/utils/salesOrderShipAccessories'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import ListFilterBar from '@/components/ListFilterBar.vue'

const props = defineProps({
  lineItems: { type: Array, default: () => [] },
  scatterShipments: { type: Array, default: () => [] },
  salesOrder: { type: Object, default: null },
  salesOrderId: { type: String, default: '' },
  warehouse: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** 保留入参，发货单不再提供「带出标准包」 */
  showBringStandardKit: { type: Boolean, default: false },
  title: { type: String, default: '随货配件' },
  titleTip: { type: String, default: '' },
  hideProductSourceColumns: { type: Boolean, default: false },
  showOutboundStatus: { type: Boolean, default: false },
  delivery: { type: Object, default: null },
  expandAllByDefault: { type: Boolean, default: true },
  /** 配件补发：锚点含已发完产品行，不因本票无整机发运而裁剪 */
  accessoryReship: { type: Boolean, default: false },
  /** 补发时用销售订单明细作分组锚点（可含已发完） */
  anchorLineItems: { type: Array, default: () => [] },
  emptyDescription: { type: String, default: '' },
})

const attachments = defineModel({ type: Array, default: () => [] })

/** 销售订单时确定：不可新增/删除配件；申请发货时确定：可组合清单 */
const allowComposeList = computed(() => {
  void functionParamState.params.shipAttachmentDecideStage
  if (props.accessoryReship) return true
  return !isShipAttachmentDecidedAtOrder()
})

const resolvedTitleTip = computed(() => {
  if (props.titleTip) return props.titleTip
  if (!allowComposeList.value) {
    return '清单继承销售订单已确定的随货配件。本票仅可勾选「纳入本单」、调整发货套数/本次发运数量，不可新增或删除配件。'
  }
  return '随货配件不关联产品。按本单出库仓库显示可用库存；可从随货配件或主数据添加，勾选纳入本单并填写本次发运数量。'
})

const resolvedEmptyDescription = computed(() => {
  if (props.emptyDescription) return props.emptyDescription
  if (props.accessoryReship || allowComposeList.value) {
    return '暂无随货配件：请从随货配件添加，或从主数据选择类型为「配件」的物料'
  }
  return '暂无随货配件：请确认销售订单已维护随货配件快照'
})

const attachmentPickerOpen = ref(false)
const packageOpen = ref(false)
const packageForm = reactive({
  bomId: undefined,
  productKey: undefined,
  kitSets: 1,
})
const packageFilters = reactive({
  bomName: '',
  bomNo: '',
})
const packageFilterApplied = reactive({
  bomName: '',
  bomNo: '',
})
const packagePage = reactive({ current: 1, pageSize: 8 })
const attachmentActiveKey = ref(props.expandAllByDefault ? [] : '')

const packageRows = computed(() => listActiveSharedShipBoms())
const filteredPackageRows = computed(() => {
  const nameKw = String(packageFilterApplied.bomName || '')
    .trim()
    .toLowerCase()
  const noKw = String(packageFilterApplied.bomNo || '')
    .trim()
    .toLowerCase()
  return packageRows.value.filter((row) => {
    const name = String(row.bomName || row.itemName || '').toLowerCase()
    const no = String(row.bomNo || '').toLowerCase()
    if (nameKw && !name.includes(nameKw)) return false
    if (noKw && !no.includes(noKw)) return false
    return true
  })
})
const pagedPackageRows = computed(() => {
  const start = (packagePage.current - 1) * packagePage.pageSize
  return filteredPackageRows.value.slice(start, start + packagePage.pageSize)
})
const packageColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '配件包名称', dataIndex: 'bomName', ellipsis: true },
  { title: '编号', dataIndex: 'bomNo', width: 140, ellipsis: true },
  { title: '版本', dataIndex: 'version', width: 80 },
]
const packageRowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: packageForm.bomId ? [packageForm.bomId] : [],
  onChange: (keys) => {
    packageForm.bomId = keys[0]
  },
}))
function packageCustomRow(record) {
  return {
    onClick: () => {
      packageForm.bomId = record.id
    },
  }
}

const selectedPackage = computed(
  () => packageRows.value.find((row) => row.id === packageForm.bomId) || null,
)

function clearPackageSelection() {
  packageForm.bomId = undefined
}

function searchPackageList() {
  packageFilterApplied.bomName = packageFilters.bomName
  packageFilterApplied.bomNo = packageFilters.bomNo
  packagePage.current = 1
}

function resetPackageFilters() {
  packageFilters.bomName = ''
  packageFilters.bomNo = ''
  packageFilterApplied.bomName = ''
  packageFilterApplied.bomNo = ''
  packagePage.current = 1
}

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
    { title: '可用库存', key: 'availableStock', width: 96, align: 'right' },
  )
  if (allowComposeList.value) {
    cols.push({ title: '操作', key: 'action', width: 72, align: 'center' })
  }
  return cols
})

const tableScrollX = computed(() => {
  return shipAttachmentColumns.value.reduce((s, c) => s + (Number(c.width) || 120), 0)
})

function attachmentRowClassName(record) {
  return record?.selected === false ? 'ship-att-row-excluded' : ''
}

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
    const missing = keys.some((key) => !cur.includes(key))
    if (missing) attachmentActiveKey.value = keys
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

function refreshAttachmentStock() {
  ;(attachments.value || []).forEach((row) => enrichShipAccessoryStock(row, props.warehouse))
}

watch(
  () => props.warehouse,
  () => refreshAttachmentStock(),
)

function openAddPackage() {
  if (!packageRows.value.length) {
    message.warning('暂无已启用的随货配件包，请先在「随货配件」维护')
    return
  }
  resetPackageFilters()
  packageForm.bomId = undefined
  packageForm.productKey = undefined
  packageForm.kitSets = 1
  packageOpen.value = true
}

function confirmAddPackage() {
  const bom = getProductBomById(packageForm.bomId)
  if (!bom) {
    message.warning('请选择配件包')
    return Promise.reject()
  }
  const kitSets = Math.max(1, Number(packageForm.kitSets) || 1)
  const opt = shipAttachmentProductOpts.value.find((item) => item.value === packageForm.productKey)
  const added = buildShipAttachmentsFromBom(bom, {
    productQty: kitSets,
    productId: opt?.productId || '',
    productCode: opt?.productCode || '',
    productName: opt?.productName || '',
    salesLineId: opt?.salesLineId || '',
    warehouse: props.warehouse,
    selected: true,
  }).map((row) => {
    const next = {
      ...row,
      kitSets,
      sourceBomName: bom.bomName || bom.itemName || '',
      selected: true,
    }
    return enrichShipAccessoryStock(next, props.warehouse)
  })
  if (!added.length) {
    message.warning('该配件包没有明细')
    return Promise.reject()
  }
  attachments.value = enrichShipAttachmentsWithShipStatus(
    [...(attachments.value || []), ...added],
    props.salesOrder,
    { preserveShipQty: true },
  )
  refreshAttachmentStock()
  packageOpen.value = false
  activateGroups()
  message.success(`已添加配件包「${bom.bomName || bom.itemName}」共 ${added.length} 项`)
}

function currentDeliveryLinesForAttachments() {
  const lines = []
  const push = (row, { ignoreLock = false } = {}) => {
    if (!row) return
    if (!ignoreLock && isDeliveryLineShipLocked(row)) return
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
      orderQty: row.orderQty ?? row.salesQty ?? row.qty,
    })
  }
  if (props.accessoryReship) {
    const anchors = props.anchorLineItems?.length
      ? props.anchorLineItems
      : [...(props.lineItems || []), ...(props.scatterShipments || [])]
    anchors.forEach((row) => push(row, { ignoreLock: true }))
    return lines
  }
  ;(props.lineItems || []).forEach(push)
  ;(props.scatterShipments || []).forEach(push)
  return lines
}

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
  // 订单已确定的随货配件整单继承，本票只勾选发哪些，不因归属产品匹配失败被清空
  if (att.fromOrderSnapshot) return true
  if (!att.productId && !att.productCode && !att.productName && !att.salesLineId) return true
  const lines = currentDeliveryLinesForAttachments()
  return lines.some((line) => attachmentMatchesDeliveryLine(att, line))
}

function attachmentMatchesDeliveryLine(att, line) {
  if (!att || !line) return false
  if (att.salesLineId && (att.salesLineId === line.id || att.salesLineId === line.salesLineId)) {
    return true
  }
  if (
    att.productId &&
    (String(att.productId) === String(line.productId) || String(att.productId) === String(line.id))
  ) {
    return true
  }
  const attCode = att.productCode || ''
  const lineCode = line.productCode || line.itemCode || ''
  if (attCode && lineCode && attCode === lineCode) return true
  return false
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
  let seed
  if (props.accessoryReship) {
    // 补发种子由外层注入时勿覆盖；无数据时再按订单带出
    if (!merge && attachments.value?.length) {
      attachments.value = enrichShipAttachmentsWithShipStatus(attachments.value, so, {
        preserveShipQty: true,
      })
      pruneToCurrentDelivery()
      activateGroups()
      return
    }
    if (isShipAttachmentDecidedAtOrder() && so?.shipAccessories?.length) {
      seed = cloneOrderShipAccessoriesForDelivery(so, { warehouse: props.warehouse })
    } else {
      seed = collectShipAttachmentsFromSalesLines(currentDeliveryLinesForAttachments(), {
        warehouse: props.warehouse,
      })
    }
  } else if (so?.shipAccessories?.length) {
    seed = cloneOrderShipAccessoriesForDelivery(so, { warehouse: props.warehouse })
  } else if (!isShipAttachmentDecidedAtOrder()) {
    seed = []
  } else {
    seed = collectShipAttachmentsFromSalesLines(currentDeliveryLinesForAttachments(), {
      warehouse: props.warehouse,
    })
  }
  const fromBom = enrichShipAttachmentsWithShipStatus(seed, so)
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
  if (!props.accessoryReship) syncKitSetsFromWholeLines()
  refreshAttachmentStock()
  activateGroups()
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
      enrichShipAccessoryStock(exists, props.warehouse)
      return
    }
    const row = createShipAttachmentLine({
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
    })
    attachments.value.push(enrichShipAccessoryStock(row, props.warehouse))
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
.package-settings {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 24px;
  margin: 0 0 12px;
}

.package-settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.package-settings-label {
  flex: none;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;

  &.required::before {
    content: '*';
    color: #ff4d4f;
    margin-right: 4px;
  }
}

.package-product-select {
  width: 420px;
}

.package-sets-input {
  width: 100px;
}

.filter-card {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.list-filter-toolbar) {
    margin-top: 0;
  }
}

.package-filter-form {
  :deep(.list-filter-fields) {
    grid-template-columns: auto auto auto;
    justify-content: start;
    width: auto;
  }

  :deep(.ant-form-item) {
    width: auto;
  }

  :deep(.ant-form-item-control) {
    flex: none;
    width: 420px;
  }

  :deep(.list-filter-actions-cell) {
    grid-column: 3 !important;
    width: auto;
    justify-content: flex-start;
  }
}

.picker-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-frame {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}

.table-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.package-pick-table {
  :deep(.ant-table-body) {
    min-height: 360px;
  }

  :deep(.ant-table-tbody > tr) {
    cursor: pointer;
  }

  :deep(.ant-pagination) {
    margin: 0;
    padding: 8px 12px;
    border-top: 1px solid #f0f0f0;
  }
}

.selected-panel {
  width: 260px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.selected-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.clear-btn {
  padding: 0;
  height: auto;
}

.selected-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.selected-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.selected-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-code {
  font-size: 12px;
  color: #1677ff;
  font-weight: 500;
}

.selected-name {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);

  &:hover {
    color: #ff4d4f;
  }
}

.selected-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.ship-att-empty {
  margin: 8px 0 4px;
  padding: 8px 0;
}

.section-block {
  margin-bottom: 8px;

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
  gap: 8px;
  margin-bottom: 4px;
}

.section-divider {
  margin: 8px 0 16px;
}

.th-tip-icon {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
}

:deep(.ship-att-row-excluded) > td {
  color: rgba(0, 0, 0, 0.35) !important;
  background: #f5f5f5 !important;
}

:deep(.ship-att-row-excluded) .ant-input-number,
:deep(.ship-att-row-excluded) .ant-select-selector,
:deep(.ship-att-row-excluded) .ant-input {
  background: #f5f5f5 !important;
  color: rgba(0, 0, 0, 0.35);
}

.ship-att-collapse {
  margin-top: 4px;
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
