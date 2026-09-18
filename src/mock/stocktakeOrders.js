import dayjs from 'dayjs'
import {
  STOCKTAKE_SOURCE,
  STOCKTAKE_STATUS,
  STOCKTAKE_TYPE,
  STOCKTAKE_POSTING,
} from '@/mock/stocktakeOptions'
import {
  SIMPLE_UNIT_DEMO_CODE,
  SIMPLE_UNIT_DEMO_NAME,
  STEEL_PIPE_CODE,
  STEEL_PIPE_NAME,
  STEEL_WEIGHT_BAR_CODE,
  STEEL_WEIGHT_BAR_NAME,
  CASTING_BLANK_SETTLE_CODE,
  CASTING_BLANK_SETTLE_NAME,
} from '@/mock/stockBatchSeed'

export function createStocktakeLine(partial = {}) {
  return {
    id: `st-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: '',
    itemName: '',
    itemType: '物料',
    specModel: '',
    material: '',
    variantSummary: '',
    unit: '件',
    batchId: '',
    batchNo: '',
    salesOrderId: '',
    salesOrderNo: '',
    salesLineId: '',
    locationNo: '',
    dedicated: false,
    bookQty: 0,
    actualQty: 0,
    diffQty: 0,
    lineStatus: STOCKTAKE_STATUS.PENDING_APPROVAL,
    refuseReason: '',
    linkedOutboundId: '',
    linkedInboundId: '',
    linkedOutboundDocNo: '',
    linkedInboundDocNo: '',
    ...partial,
  }
}

export function createStocktakeOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    docNo: '',
    status: STOCKTAKE_STATUS.PENDING_APPROVAL,
    sourceChannel: STOCKTAKE_SOURCE.MANUAL,
    warehouse: '',
    stocktakeType: STOCKTAKE_TYPE.OTHER,
    stocktakeDate: dayjs().format('YYYY-MM-DD'),
    applicant: 'admin1',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    approver: '',
    approvedAt: '',
    postedAt: '',
    postingStatus: '',
    postingError: '',
    refuseReason: '',
    refusedBy: '',
    refusedAt: '',
    remark: '',
    linkedOutboundIds: [],
    linkedInboundIds: [],
    linkedOutboundDocNos: [],
    linkedInboundDocNos: [],
    lineItems: [],
    ...partial,
  }
}

export function generateStocktakeNo() {
  return `PD${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

function withDiff(partial) {
  const bookQty = Number(partial.bookQty) || 0
  const actualQty = Number(partial.actualQty) || 0
  return createStocktakeLine({
    ...partial,
    bookQty,
    actualQty,
    diffQty: actualQty - bookQty,
  })
}

/**
 * 盘点单演示种子：待审核 / 审核通过(待过账) / 已过账 / 已拒绝 / 过账失败
 */
export function cloneStocktakeSeedOrders() {
  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const twoDaysAgo = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
  const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD')

  return [
    createStocktakeOrder({
      id: 'st-seed-pending',
      docNo: 'PD20260918001',
      status: STOCKTAKE_STATUS.PENDING_APPROVAL,
      stocktakeType: STOCKTAKE_TYPE.CLOSING,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '原料仓',
      stocktakeDate: today,
      applicant: 'admin1',
      creator: '管理员',
      createdAt: `${today} 09:30:00`,
      remark: '演示：原料仓期末盘点，待审核',
      lineItems: [
        withDiff({
          id: 'st-seed-pending-l1',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          specModel: '6205-2RS',
          material: 'GCr15',
          unit: '件',
          bookQty: 50,
          actualQty: 48,
          dedicated: false,
        }),
        withDiff({
          id: 'st-seed-pending-l2',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          unit: '米',
          bookQty: 48,
          actualQty: 52,
          dedicated: false,
        }),
        withDiff({
          id: 'st-seed-pending-l3',
          itemCode: STEEL_WEIGHT_BAR_CODE,
          itemName: STEEL_WEIGHT_BAR_NAME,
          specModel: 'φ40',
          material: '40Cr',
          unit: 'kg',
          bookQty: 200,
          actualQty: 200,
          dedicated: false,
        }),
      ],
    }),

    createStocktakeOrder({
      id: 'st-seed-approved',
      docNo: 'PD20260917002',
      status: STOCKTAKE_STATUS.APPROVED,
      postingStatus: STOCKTAKE_POSTING.PENDING,
      stocktakeType: STOCKTAKE_TYPE.OTHER,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '半成品仓',
      stocktakeDate: yesterday,
      applicant: '张三',
      creator: '管理员',
      createdAt: `${yesterday} 13:10:00`,
      approver: '管理员',
      approvedAt: `${yesterday} 16:00:00`,
      remark: '演示：审核通过，待手动过账',
      lineItems: [
        withDiff({
          id: 'st-seed-approved-l1',
          itemCode: CASTING_BLANK_SETTLE_CODE,
          itemName: CASTING_BLANK_SETTLE_NAME,
          unit: '件',
          bookQty: 30,
          actualQty: 28,
          dedicated: false,
        }),
      ],
    }),

    createStocktakeOrder({
      id: 'st-seed-posted',
      docNo: 'PD20260916003',
      status: STOCKTAKE_STATUS.POSTED,
      postingStatus: STOCKTAKE_POSTING.SUCCESS,
      stocktakeType: STOCKTAKE_TYPE.CLOSING,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '库线边仓',
      stocktakeDate: twoDaysAgo,
      applicant: '李四',
      creator: '管理员',
      createdAt: `${twoDaysAgo} 08:50:00`,
      approver: '李四',
      approvedAt: `${twoDaysAgo} 17:00:00`,
      confirmer: '李四',
      confirmedAt: `${twoDaysAgo} 17:20:00`,
      postedAt: `${twoDaysAgo} 17:20:00`,
      remark: '演示：已过账',
      linkedOutboundIds: ['ob-st-seed-done'],
      linkedInboundIds: ['ib-st-seed-done'],
      linkedOutboundDocNos: ['CK202609160P03'],
      linkedInboundDocNos: ['RK202609160P03'],
      lineItems: [
        withDiff({
          id: 'st-seed-posted-l1',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          unit: '件',
          bookQty: 10,
          actualQty: 12,
          lineStatus: STOCKTAKE_STATUS.POSTED,
          dedicated: false,
          linkedInboundId: 'ib-st-seed-done',
          linkedInboundDocNo: 'RK202609160P03',
        }),
        withDiff({
          id: 'st-seed-posted-l2',
          itemCode: STEEL_WEIGHT_BAR_CODE,
          itemName: STEEL_WEIGHT_BAR_NAME,
          unit: 'kg',
          bookQty: 80,
          actualQty: 75,
          lineStatus: STOCKTAKE_STATUS.POSTED,
          dedicated: false,
          linkedOutboundId: 'ob-st-seed-done',
          linkedOutboundDocNo: 'CK202609160P03',
        }),
      ],
    }),

    createStocktakeOrder({
      id: 'st-seed-refused',
      docNo: 'PD20260915004',
      status: STOCKTAKE_STATUS.REFUSED,
      stocktakeType: STOCKTAKE_TYPE.COST,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '成品主仓',
      stocktakeDate: threeDaysAgo,
      applicant: '王五',
      creator: '管理员',
      createdAt: `${threeDaysAgo} 10:00:00`,
      refuseReason: '盘点数量未复核',
      refusedBy: '仓管员乙',
      refusedAt: `${threeDaysAgo} 15:40:00`,
      remark: '演示：已拒绝',
      lineItems: [
        withDiff({
          id: 'st-seed-refused-l1',
          itemCode: 'CP-PUMP-01',
          itemName: '离心泵总成',
          itemType: '产品',
          unit: '台',
          bookQty: 10,
          actualQty: 9,
          lineStatus: STOCKTAKE_STATUS.REFUSED,
          refuseReason: '盘点数量未复核',
        }),
      ],
    }),

    createStocktakeOrder({
      id: 'st-seed-post-fail',
      docNo: 'PD20260918005',
      status: STOCKTAKE_STATUS.APPROVED,
      postingStatus: STOCKTAKE_POSTING.FAILED,
      postingError: '演示：自由可用不足，过账失败（可重新过账）',
      stocktakeType: STOCKTAKE_TYPE.OPENING,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '原料仓',
      stocktakeDate: today,
      applicant: '系统',
      creator: '系统',
      createdAt: `${today} 11:30:00`,
      approver: '管理员',
      approvedAt: `${today} 12:00:00`,
      remark: '演示：审核通过但过账失败',
      lineItems: [
        withDiff({
          id: 'st-seed-post-fail-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          unit: '米',
          bookQty: 36,
          actualQty: 10,
          dedicated: false,
        }),
      ],
    }),
  ]
}
