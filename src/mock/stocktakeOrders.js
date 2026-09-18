import dayjs from 'dayjs'
import { STOCKTAKE_SOURCE, STOCKTAKE_STATUS } from '@/mock/stocktakeOptions'
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
    unit: '件',
    batchId: '',
    batchNo: '',
    salesOrderId: '',
    salesOrderNo: '',
    salesLineId: '',
    locationNo: '',
    bookQty: 0,
    actualQty: 0,
    diffQty: 0,
    lineStatus: STOCKTAKE_STATUS.PENDING,
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
    status: STOCKTAKE_STATUS.PENDING,
    sourceChannel: STOCKTAKE_SOURCE.MANUAL,
    warehouse: '',
    stocktakeDate: dayjs().format('YYYY-MM-DD'),
    applicant: 'admin1',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
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
 * 盘点单演示种子：覆盖待确认 / 部分确认 / 已确认 / 已拒绝，含盘盈、盘亏、账实相符行。
 * 刷新后若 seed version 变化会整表重载。
 */
export function cloneStocktakeSeedOrders() {
  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const twoDaysAgo = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
  const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD')

  return [
    // 1. 待确认（盘盈 + 盘亏 + 相符，可确认/拒绝/编辑）
    createStocktakeOrder({
      id: 'st-seed-pending',
      docNo: 'PD20260918001',
      status: STOCKTAKE_STATUS.PENDING,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '原料仓',
      stocktakeDate: today,
      applicant: 'admin1',
      creator: '管理员',
      createdAt: `${today} 09:30:00`,
      remark: '演示：原料仓月度盘点，待确认',
      lineItems: [
        withDiff({
          id: 'st-seed-pending-l1',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          specModel: '6205-2RS',
          material: 'GCr15',
          unit: '件',
          batchNo: 'BAT-BEARING-001',
          locationNo: 'D-01-01',
          bookQty: 50,
          actualQty: 48,
          lineStatus: STOCKTAKE_STATUS.PENDING,
        }),
        withDiff({
          id: 'st-seed-pending-l2',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          unit: '米',
          batchNo: 'BAT-PIPE-001',
          locationNo: 'A-02-03',
          bookQty: 48,
          actualQty: 52,
          lineStatus: STOCKTAKE_STATUS.PENDING,
        }),
        withDiff({
          id: 'st-seed-pending-l3',
          itemCode: STEEL_WEIGHT_BAR_CODE,
          itemName: STEEL_WEIGHT_BAR_NAME,
          specModel: 'φ40',
          material: '40Cr',
          unit: 'kg',
          batchNo: 'BAT-BAR-001',
          locationNo: 'C-03-01',
          bookQty: 200,
          actualQty: 200,
          lineStatus: STOCKTAKE_STATUS.PENDING,
        }),
      ],
    }),

    // 2. 部分确认（一行已确认盘亏，一行仍待确认）
    createStocktakeOrder({
      id: 'st-seed-partial',
      docNo: 'PD20260917002',
      status: STOCKTAKE_STATUS.PARTIAL,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '半成品仓',
      stocktakeDate: yesterday,
      applicant: '张三',
      creator: '管理员',
      createdAt: `${yesterday} 13:10:00`,
      remark: '演示：半成品仓部分确认',
      linkedOutboundIds: ['ob-st-seed-partial'],
      linkedOutboundDocNos: ['CK202609170P02'],
      lineItems: [
        withDiff({
          id: 'st-seed-partial-l1',
          itemCode: CASTING_BLANK_SETTLE_CODE,
          itemName: CASTING_BLANK_SETTLE_NAME,
          specModel: '泵体毛坯',
          material: 'HT250',
          unit: '件',
          batchNo: 'BAT-CAST-001',
          locationNo: 'B-01-02',
          bookQty: 30,
          actualQty: 28,
          lineStatus: STOCKTAKE_STATUS.DONE,
          linkedOutboundId: 'ob-st-seed-partial',
          linkedOutboundDocNo: 'CK202609170P02',
        }),
        withDiff({
          id: 'st-seed-partial-l2',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          unit: '米',
          batchNo: 'BAT-PIPE-HP-01',
          locationNo: 'B-03-01',
          bookQty: 17.5,
          actualQty: 18,
          lineStatus: STOCKTAKE_STATUS.PENDING,
        }),
      ],
    }),

    // 3. 已确认（盘盈入库 + 盘亏出库均已生成）
    createStocktakeOrder({
      id: 'st-seed-done',
      docNo: 'PD20260916003',
      status: STOCKTAKE_STATUS.DONE,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '库线边仓',
      stocktakeDate: twoDaysAgo,
      applicant: '李四',
      creator: '管理员',
      createdAt: `${twoDaysAgo} 08:50:00`,
      confirmer: '李四',
      confirmedAt: `${twoDaysAgo} 17:20:00`,
      remark: '演示：库线边仓盘点已确认',
      linkedOutboundIds: ['ob-st-seed-done'],
      linkedInboundIds: ['ib-st-seed-done'],
      linkedOutboundDocNos: ['CK202609160P03'],
      linkedInboundDocNos: ['RK202609160P03'],
      lineItems: [
        withDiff({
          id: 'st-seed-done-l1',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          specModel: '6205-2RS',
          material: 'GCr15',
          unit: '件',
          batchNo: 'BAT-BEARING-XB-01',
          locationNo: 'X-01-01',
          bookQty: 10,
          actualQty: 12,
          lineStatus: STOCKTAKE_STATUS.DONE,
          linkedInboundId: 'ib-st-seed-done',
          linkedInboundDocNo: 'RK202609160P03',
        }),
        withDiff({
          id: 'st-seed-done-l2',
          itemCode: STEEL_WEIGHT_BAR_CODE,
          itemName: STEEL_WEIGHT_BAR_NAME,
          specModel: 'φ40',
          material: '40Cr',
          unit: 'kg',
          batchNo: 'BAT-BAR-XB-01',
          locationNo: 'X-02-02',
          bookQty: 80,
          actualQty: 75,
          lineStatus: STOCKTAKE_STATUS.DONE,
          linkedOutboundId: 'ob-st-seed-done',
          linkedOutboundDocNo: 'CK202609160P03',
        }),
      ],
    }),

    // 4. 已拒绝
    createStocktakeOrder({
      id: 'st-seed-refused',
      docNo: 'PD20260915004',
      status: STOCKTAKE_STATUS.REFUSED,
      sourceChannel: STOCKTAKE_SOURCE.MANUAL,
      warehouse: '成品主仓',
      stocktakeDate: threeDaysAgo,
      applicant: '王五',
      creator: '管理员',
      createdAt: `${threeDaysAgo} 10:00:00`,
      refuseReason: '盘点数量未复核，暂不入账',
      refusedBy: '仓管员乙',
      refusedAt: `${threeDaysAgo} 15:40:00`,
      remark: '演示：整单拒绝',
      lineItems: [
        withDiff({
          id: 'st-seed-refused-l1',
          itemCode: 'CP-PUMP-01',
          itemName: '离心泵总成',
          itemType: '产品',
          specModel: 'IS80-65-160',
          unit: '台',
          batchNo: 'BAT-CP-001',
          locationNo: 'F-01-01',
          bookQty: 10,
          actualQty: 9,
          lineStatus: STOCKTAKE_STATUS.REFUSED,
          refuseReason: '盘点数量未复核',
        }),
      ],
    }),

    // 5. 业务来源待确认（不可删除）
    createStocktakeOrder({
      id: 'st-seed-business',
      docNo: 'PD20260918005',
      status: STOCKTAKE_STATUS.PENDING,
      sourceChannel: STOCKTAKE_SOURCE.BUSINESS,
      warehouse: '原料仓',
      stocktakeDate: today,
      applicant: '系统',
      creator: '系统',
      createdAt: `${today} 11:30:00`,
      remark: '演示：业务来源盘点单，不可删除',
      lineItems: [
        withDiff({
          id: 'st-seed-business-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          unit: '米',
          batchNo: 'BAT-PIPE-BIZ-01',
          locationNo: 'A-01-02',
          bookQty: 36,
          actualQty: 36,
          lineStatus: STOCKTAKE_STATUS.PENDING,
        }),
      ],
    }),
  ]
}
