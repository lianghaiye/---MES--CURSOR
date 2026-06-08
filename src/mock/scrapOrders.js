import dayjs from 'dayjs'
import { calcScrapCost, resolveUnitPrice } from '@/utils/scrapOrderUtils'

const ITEMS = [
  {
    itemName: '污水泵',
    itemCode: 'CP2610002',
    specModel: 'ISG80-160(I)A',
    material: '铸铁',
    unit: '台',
  },
  {
    itemName: '清水离心泵',
    itemCode: 'CP2610001',
    specModel: 'ISG50-160',
    material: '不锈钢',
    unit: '台',
  },
  {
    itemName: '立式多级泵',
    itemCode: 'CP2610003',
    specModel: 'CDL4-40',
    material: '铸铁',
    unit: '台',
  },
  {
    itemName: '深井潜水泵',
    itemCode: 'CP2610004',
    specModel: 'QJ200-50/4',
    material: '不锈钢',
    unit: '台',
  },
  {
    itemName: '电机端盖',
    itemCode: 'CP2610005',
    specModel: 'DJ-160',
    material: '铸铁',
    unit: '件',
  },
]

const REASONS = ['尺寸超差', '外观不良', '性能不达标', '材料缺陷', '装配不良']
const WORK_ORDERS = ['WO202605001', 'WO202605002', 'WO202605003', 'WO202605004']
const REPORTERS = ['张工', '李工', '王工', '赵工']
const PROCESS_NAMES = ['机加工', '装配', '焊接', '质检', '涂装']
const RESPONSIBLE_PROCESSES = ['机加工', '装配', '焊接', '质检']
const RESPONSIBLE_PERSONS = ['陈师傅', '刘师傅', '周师傅', '吴师傅']
const DISASSEMBLY_EXECUTORS = ['拆解员甲', '拆解员乙', '拆解员丙']

function buildScrapRow(partial) {
  const item = partial.item || ITEMS[0]
  const qty = partial.qty ?? 1
  const unitPrice = partial.unitPrice ?? resolveUnitPrice(item.itemCode)
  const needReplenish = partial.needReplenish ?? true
  const scrapSource = partial.scrapSource || '报废申请'
  const reportedBy = partial.reportedBy || REPORTERS[0]
  const reportedAt = partial.reportedAt || dayjs().format('YYYY-MM-DD HH:mm')
  return {
    id: partial.id,
    scrapNo: partial.scrapNo,
    scrapSource,
    auditStatus: partial.auditStatus || '待审核',
    replenishStatus: partial.replenishStatus || (needReplenish ? '未补料' : '不需补料'),
    processStatus: partial.processStatus || '未处理',
    itemName: item.itemName,
    itemCode: item.itemCode,
    specModel: item.specModel,
    material: item.material,
    unit: item.unit,
    qty,
    unitPrice,
    costAmount: calcScrapCost(qty, unitPrice),
    scrapReason: partial.scrapReason || REASONS[0],
    replenishMethod: needReplenish ? partial.replenishMethod || '库存补料' : '-',
    needReplenish,
    processMethod: partial.processMethod || '',
    processResult: partial.processResult || '',
    warehouse: partial.warehouse || '',
    warehouseKeeper: partial.warehouseKeeper || '',
    auditComment: partial.auditComment || '',
    relatedWorkOrderNo: partial.relatedWorkOrderNo || partial.workOrderNo || WORK_ORDERS[0],
    workOrderNo: partial.workOrderNo || partial.relatedWorkOrderNo || WORK_ORDERS[0],
    workshop: partial.workshop || '机加车间',
    processName: partial.processName || PROCESS_NAMES[0],
    responsibleProcess: partial.responsibleProcess || RESPONSIBLE_PROCESSES[0],
    responsiblePerson: partial.responsiblePerson || RESPONSIBLE_PERSONS[0],
    applicant: partial.applicant || reportedBy,
    appliedAt: partial.appliedAt || reportedAt,
    reportedBy,
    reportedAt,
    disassemblyExecutor: partial.disassemblyExecutor || '',
    createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD'),
    auditedAt: partial.auditedAt || '',
    auditor: partial.auditor || '',
    replenishLinks: partial.replenishLinks || [],
    disposalLinks: partial.disposalLinks || [],
    disassemblyWorkOrderId: partial.disassemblyWorkOrderId || '',
    disassemblyWorkOrderCode: partial.disassemblyWorkOrderCode || '',
  }
}

/** 报废单种子数据（工人报工提交，PC 仅审核/补料） */
export function createScrapOrderSeed() {
  const rows = []
  let seq = 1
  const ym = '202605'

  const push = (partial) => {
    const item = ITEMS[(seq - 1) % ITEMS.length]
    const idx = seq - 1
    const isDisassemblySource = partial.scrapSource === '拆解报废'
    const reportedAt = dayjs('2026-05-01').add(idx, 'day').format('YYYY-MM-DD HH:mm')
    rows.push(
      buildScrapRow({
        id: `scrap-${seq}`,
        scrapNo: `BF${ym}${String(seq).padStart(4, '0')}`,
        item,
        scrapSource: isDisassemblySource ? '拆解报废' : '报废申请',
        reportedBy: REPORTERS[idx % REPORTERS.length],
        applicant: isDisassemblySource
          ? partial.disassemblyExecutor || DISASSEMBLY_EXECUTORS[idx % DISASSEMBLY_EXECUTORS.length]
          : REPORTERS[idx % REPORTERS.length],
        workOrderNo: WORK_ORDERS[idx % WORK_ORDERS.length],
        relatedWorkOrderNo: WORK_ORDERS[idx % WORK_ORDERS.length],
        scrapReason: REASONS[idx % REASONS.length],
        processName: PROCESS_NAMES[idx % PROCESS_NAMES.length],
        responsibleProcess: RESPONSIBLE_PROCESSES[idx % RESPONSIBLE_PROCESSES.length],
        responsiblePerson: RESPONSIBLE_PERSONS[idx % RESPONSIBLE_PERSONS.length],
        disassemblyExecutor: isDisassemblySource
          ? partial.disassemblyExecutor || DISASSEMBLY_EXECUTORS[idx % DISASSEMBLY_EXECUTORS.length]
          : '',
        disassemblyWorkOrderCode: isDisassemblySource
          ? partial.disassemblyWorkOrderCode || `CJGD202605${String(seq).padStart(4, '0')}`
          : partial.disassemblyWorkOrderCode || '',
        reportedAt,
        appliedAt: reportedAt,
        createdAt: dayjs('2026-05-01').add(idx, 'day').format('YYYY-MM-DD'),
        ...partial,
      }),
    )
    seq += 1
  }

  // 待审核 12 条
  for (let i = 0; i < 12; i += 1) {
    push({
      scrapSource: i % 4 === 0 ? '拆解报废' : '报废申请',
      auditStatus: '待审核',
      replenishStatus: '未补料',
      processStatus: '未处理',
      needReplenish: i % 3 !== 0,
      replenishMethod: i % 2 === 0 ? '库存补料' : '采购补料',
      processMethod: '',
      processResult: '',
    })
  }

  // 审核通过 - 未补料 8 条
  for (let i = 0; i < 8; i += 1) {
    push({
      auditStatus: '审核通过',
      replenishStatus: '未补料',
      processStatus: '已处理',
      needReplenish: true,
      replenishMethod: i % 2 === 0 ? '库存补料' : '采购补料',
      processMethod: ['退库', '报废', '拆解'][i % 3],
      processResult: i % 3 === 1 ? '财物变现' : '',
      warehouse: i % 3 === 0 ? '半成品仓' : i % 3 === 1 ? '原料仓' : '',
      warehouseKeeper: i % 3 === 0 ? '李四' : i % 3 === 1 ? '张三' : '',
      auditedAt: '2026-05-20 10:00',
      auditor: '质检员A',
      disposalLinks:
        i % 3 === 0
          ? [
              {
                type: 'inbound',
                id: `ib-seed-${seq}`,
                docNo: `IN2026052000${i + 1}`,
                inboundType: '生产退库',
              },
            ]
          : i % 3 === 1
            ? [
                {
                  type: 'inbound',
                  id: `ib-seed-scrap-${seq}`,
                  docNo: `IN2026052100${i + 1}`,
                  inboundType: '报废入库',
                },
              ]
            : [{ type: 'disassembly', id: 'dwo-seed-1', docNo: 'CJGD2026050001' }],
      disassemblyWorkOrderId: i % 3 === 2 ? 'dwo-seed-1' : '',
      disassemblyWorkOrderCode: i % 3 === 2 ? 'CJGD2026050001' : '',
    })
  }

  // 审核通过 - 已补料 6 条
  for (let i = 0; i < 6; i += 1) {
    const isPurchase = i % 2 === 0
    push({
      auditStatus: '审核通过',
      replenishStatus: '已补料',
      processStatus: '已处理',
      needReplenish: true,
      replenishMethod: isPurchase ? '采购补料' : '库存补料',
      processMethod: '退库',
      warehouse: '半成品仓',
      warehouseKeeper: '李四',
      auditedAt: '2026-05-18 14:30',
      auditor: '质检员B',
      replenishLinks: isPurchase
        ? [{ type: 'purchase_req', id: `pr-scrap-${seq}`, docNo: `CGSQ-20260518-00${i + 1}` }]
        : [{ type: 'outbound', id: `ob-scrap-${seq}`, docNo: `OUT2026051800${i + 1}` }],
      disposalLinks: [
        {
          type: 'inbound',
          id: `ib-done-${seq}`,
          docNo: `IN2026051800${i + 1}`,
          inboundType: '生产退库',
        },
      ],
    })
  }

  // 审核通过 - 不需补料 5 条
  for (let i = 0; i < 5; i += 1) {
    push({
      auditStatus: '审核通过',
      replenishStatus: '不需补料',
      processStatus: '已处理',
      needReplenish: false,
      replenishMethod: '-',
      processMethod: i % 2 === 0 ? '报废' : '拆解',
      processResult: i % 2 === 0 ? '直接弃用' : '',
      auditedAt: '2026-05-16 09:00',
      auditor: '质检员C',
      disposalLinks:
        i % 2 === 1 ? [{ type: 'disassembly', id: 'dwo-seed-2', docNo: 'CJGD2026050002' }] : [],
      disassemblyWorkOrderId: i % 2 === 1 ? 'dwo-seed-2' : '',
      disassemblyWorkOrderCode: i % 2 === 1 ? 'CJGD2026050002' : '',
    })
  }

  // 驳回 8 条
  for (let i = 0; i < 8; i += 1) {
    push({
      auditStatus: '驳回',
      replenishStatus: '未补料',
      processStatus: '未处理',
      needReplenish: true,
      replenishMethod: '库存补料',
      auditComment: '报废原因不充分，请补充说明',
      auditedAt: '2026-05-14 16:00',
      auditor: '质检员D',
    })
  }

  return rows
}

/** 仅审核通过的报废单（拆解工单选单用） */
export function getApprovedScrapOrders(orders) {
  return orders.filter((o) => o.auditStatus === '审核通过')
}
