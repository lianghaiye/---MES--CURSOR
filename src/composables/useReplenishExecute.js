/**
 * 补货执行：采购 / 外协 / 生产 / 生产计划 + 写台账
 * 供库存预警、补货台账手工补货共用
 */
import { ref, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useTabs } from '@/composables/useTabs'
import { PLAN_SOURCE } from '@/utils/planSource'
import { REPLENISH_ACTION } from '@/utils/stockReplenish'
import { createProductionPlanFromStockReplenish } from '@/store/productionPlanStore'
import { addPurchaseRequisition } from '@/store/purchaseRequisitionStore'
import {
  addOutsourceWorkOrdersFromPlanRows,
  addWorkOrdersFromPlanRows,
} from '@/store/workOrderStore'
import { applyReplenishExecuteToLedger } from '@/store/replenishLedgerStore'

export function useReplenishExecute(options = {}) {
  const {
    remarkTag = '库存预警',
    purchaseReqSource,
    purchaseReqRemark,
    successStayLabel = '留在当前页',
    planListPath = '/planning/production-plan',
    planListTitle = '生产计划',
    ledgerPath = '/planning/replenish-ledger',
    ledgerTitle = '补货台账',
    onExecuted,
  } = options

  const router = useRouter()
  const { openTab } = useTabs()

  const purchaseModalOpen = ref(false)
  const workOrderModalOpen = ref(false)
  const outsourceModalOpen = ref(false)
  const modalOrder = ref(null)
  const modalMaterials = ref([])
  const pendingReplenishRows = ref([])

  function buildSyntheticOrder(action) {
    const labelMap = {
      [REPLENISH_ACTION.PURCHASE]: '采购补货',
      [REPLENISH_ACTION.OUTSOURCE]: '外协补货',
      [REPLENISH_ACTION.WORK_ORDER]: '生产补货',
      [REPLENISH_ACTION.PRODUCE]: '生产计划补货',
    }
    const label = labelMap[action] || '补货'
    return {
      id: `replenish-${action}-${Date.now()}`,
      orderNo: `BH${dayjs().format('YYYYMMDDHHmmss')}`,
      urgency: '普通',
      remark: `${remarkTag}${label}`,
      productQty: 1,
      planSource: PLAN_SOURCE.STOCK_REPLENISH,
      planAssemblyDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      workItems: [],
    }
  }

  function mapReplenishRowsToPlanMaterials(list, supplyType) {
    return list.map((r) => {
      const qty = Number(r.planQty) || 0
      return {
        id: r.key,
        name: r.productName,
        code: r.productCode,
        spec: r.specModel || '',
        material: r.material || '',
        drawingNo: r.drawingNo || '',
        specAttr: r.variantSummary === '—' ? '' : r.variantSummary || '',
        type: r.itemKind === 'material' ? '零部件' : '成品',
        supplyType,
        unit: r.unit || '件',
        demandQty: qty,
        gapQty: qty,
        planQty: qty,
        availableStock: Number(r.availableStock) || 0,
        stockQty: Number(r.availableStock) || 0,
        maxStockQty: Number(r.maxStockQty) || 0,
        minStockQty: Number(r.minStockQty) || 0,
        suggestQty: Number(r.suggestQty) || 0,
        warehouse: r.defaultWarehouse || '',
        workCenter: r.defaultWorkCenter || '',
        inTransitQty: Number(r.inTransitQty) || 0,
        inTransitText: r.inTransitText || '—',
        isTopLevel: true,
        bom: r.bomLabel && r.bomLabel !== '-' ? r.bomLabel : r.productName,
        bomId: r.bomId || '',
        bomName: r.bomName || '',
        bomVersion: r.bomVersion || '',
        productId: r.productId || '',
        remark: r.manual
          ? '手工补货'
          : r.fromProductionPlan || r.alertSource === 'production-plan'
            ? '生产计划关联预警'
            : remarkTag,
      }
    })
  }

  function openPurchaseModal(list) {
    pendingReplenishRows.value = list.map((r) => ({ ...r }))
    modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.PURCHASE)
    modalMaterials.value = mapReplenishRowsToPlanMaterials(list, '外购件')
    purchaseModalOpen.value = true
  }

  function openWorkOrderModal(list) {
    const withBom = list.filter((r) => r.hasBom)
    const skippedNoBom = list.filter((r) => !r.hasBom)
    if (!withBom.length) {
      message.warning(
        `未打开弹窗：所选「生产」行均无 BOM（${skippedNoBom.map((r) => r.productName).join('、')}），请改采购/外协/生产计划或先维护 BOM`,
      )
      return
    }
    if (skippedNoBom.length) {
      message.info(`已跳过无 BOM 的行：${skippedNoBom.map((r) => r.productName).join('、')}`)
    }
    pendingReplenishRows.value = withBom.map((r) => ({ ...r }))
    modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.WORK_ORDER)
    modalMaterials.value = mapReplenishRowsToPlanMaterials(withBom, '自制件')
    workOrderModalOpen.value = true
  }

  function openOutsourceModal(list) {
    pendingReplenishRows.value = list.map((r) => ({ ...r }))
    modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.OUTSOURCE)
    modalMaterials.value = mapReplenishRowsToPlanMaterials(list, '外协件')
    outsourceModalOpen.value = true
  }

  function showProduceSuccess(plan, producedRows, skippedNoBom, afterCleanup) {
    const lines = [
      `生产计划 ${plan.orderNo}（来源：${remarkTag}，${plan.workItems?.length || 0} 项）`,
      '已写入补货台账',
    ]
    if (skippedNoBom.length) {
      lines.push(
        `已跳过无 BOM 的生产计划行：${skippedNoBom.map((r) => r.productName).join('、')}（可改动作「采购/外协/生产」后重试）`,
      )
    }
    Modal.success({
      title: '补货执行完成',
      content: h('div', [
        h(
          'ul',
          { style: { paddingLeft: '18px', margin: '8px 0' } },
          lines.map((t) => h('li', { style: { marginBottom: '4px' } }, t)),
        ),
        h('div', { style: { marginTop: '12px' } }, [
          h(
            'a',
            {
              style: { marginRight: '16px' },
              onClick: (e) => {
                e.preventDefault()
                openTab(planListPath, planListTitle)
                router.push(planListPath)
                Modal.destroyAll()
              },
            },
            `查看${planListTitle}`,
          ),
          h(
            'a',
            {
              onClick: (e) => {
                e.preventDefault()
                openTab(ledgerPath, ledgerTitle)
                router.push(ledgerPath)
                Modal.destroyAll()
              },
            },
            `查看${ledgerTitle}`,
          ),
        ]),
      ]),
      okText: successStayLabel,
    })
    onExecuted?.({ plan, purchaseReq: null, outsourceOrders: [], workOrders: [] })
    afterCleanup?.(producedRows.map((r) => r.key))
  }

  function executeProducePlan(selected, afterCleanup) {
    const withBom = selected.filter((r) => r.hasBom)
    const skippedNoBom = selected.filter((r) => !r.hasBom)
    if (!withBom.length) {
      message.warning(
        `未生成单据：所选「生产计划」行均无 BOM（${skippedNoBom.map((r) => r.productName).join('、')}），请改采购/外协/生产或先维护 BOM`,
      )
      return
    }
    const plan = createProductionPlanFromStockReplenish(withBom)
    applyReplenishExecuteToLedger(
      withBom.map((r) => ({ ...r, action: REPLENISH_ACTION.PRODUCE })),
      { plan },
    )
    showProduceSuccess(plan, withBom, skippedNoBom, afterCleanup)
  }

  function onPurchaseSaved(requisition, afterCleanup) {
    if (!requisition) return
    requisition.source = purchaseReqSource || (remarkTag === '手工补货' ? '手工补货' : '库存补货')
    if (!requisition.remark) {
      requisition.remark = purchaseReqRemark || `${remarkTag}补货请购`
    }
    addPurchaseRequisition(requisition)
    const handled = pendingReplenishRows.value.map((r) => ({
      ...r,
      action: REPLENISH_ACTION.PURCHASE,
    }))
    applyReplenishExecuteToLedger(handled, { purchaseReq: requisition })
    message.success(
      `已写入补货台账：采购申请 ${requisition.reqNo}（${requisition.lineItems?.length || 0} 项）`,
    )
    onExecuted?.({ plan: null, purchaseReq: requisition, outsourceOrders: [], workOrders: [] })
    afterCleanup?.(handled.map((r) => r.key))
  }

  function onWorkOrderSaved(savedRows, afterCleanup) {
    const order = modalOrder.value || buildSyntheticOrder(REPLENISH_ACTION.WORK_ORDER)
    const created = addWorkOrdersFromPlanRows(savedRows, order)
    const byCode = new Map((savedRows || []).map((r) => [r.code, r]))
    const handled = pendingReplenishRows.value
      .filter((r) => byCode.has(r.productCode))
      .map((r) => {
        const saved = byCode.get(r.productCode)
        return {
          ...r,
          action: REPLENISH_ACTION.WORK_ORDER,
          planQty: Number(saved?.planQty) || Number(r.planQty) || 0,
        }
      })
    applyReplenishExecuteToLedger(handled, { workOrders: created })
    message.success(
      `已写入补货台账：加工工单 ${created.map((o) => o.code).join('、') || '—'}（共 ${created.length} 张）`,
    )
    onExecuted?.({ plan: null, purchaseReq: null, outsourceOrders: [], workOrders: created })
    afterCleanup?.(handled.map((r) => r.key))
  }

  function onOutsourceSaved(savedRows, afterCleanup) {
    const order = modalOrder.value || buildSyntheticOrder(REPLENISH_ACTION.OUTSOURCE)
    const created = addOutsourceWorkOrdersFromPlanRows(savedRows, order)
    const byCode = new Map((savedRows || []).map((r) => [r.code, r]))
    const handled = pendingReplenishRows.value
      .filter((r) => byCode.has(r.productCode))
      .map((r) => {
        const saved = byCode.get(r.productCode)
        return {
          ...r,
          action: REPLENISH_ACTION.OUTSOURCE,
          planQty: Number(saved?.planQty) || Number(r.planQty) || 0,
        }
      })
    applyReplenishExecuteToLedger(handled, { outsourceOrders: created })
    message.success(
      `已写入补货台账：外协工单 ${created.map((o) => o.code).join('、') || '—'}（共 ${created.length} 张）`,
    )
    onExecuted?.({ plan: null, purchaseReq: null, outsourceOrders: created, workOrders: [] })
    afterCleanup?.(handled.map((r) => r.key))
  }

  function dispatchExecute(selected, afterCleanup) {
    const actions = [...new Set(selected.map((r) => r.action))]
    if (actions.length > 1) {
      message.warning('所选行包含不同动作，请只选择同一动作后再执行')
      return
    }
    const action = actions[0]
    if (action === REPLENISH_ACTION.WORK_ORDER) {
      openWorkOrderModal(selected)
      return
    }
    if (action === REPLENISH_ACTION.PRODUCE) {
      executeProducePlan(selected, afterCleanup)
      return
    }
    if (action === REPLENISH_ACTION.PURCHASE) {
      openPurchaseModal(selected)
      return
    }
    if (action === REPLENISH_ACTION.OUTSOURCE) {
      openOutsourceModal(selected)
      return
    }
    message.warning('未知补货动作')
  }

  return {
    purchaseModalOpen,
    workOrderModalOpen,
    outsourceModalOpen,
    modalOrder,
    modalMaterials,
    pendingReplenishRows,
    dispatchExecute,
    onPurchaseSaved,
    onWorkOrderSaved,
    onOutsourceSaved,
  }
}
