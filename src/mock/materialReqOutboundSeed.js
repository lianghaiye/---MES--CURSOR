import { createOutboundLine, createOutboundOrder } from '@/mock/outboundOrders'

/** 与 mobileMaterialReqSeed 中已审核通过的申请单对应的领料出库演示单 */
export function createMaterialReqOutboundOrders() {
  return [
    createOutboundOrder({
      id: 'ob-mr-seed-002',
      docNo: 'OUT202607200102',
      outboundType: '领料出库',
      warehouse: '原料仓',
      receiveWarehouse: '线边仓-机加',
      requisitionDept: '机加车间',
      workshop: '机加车间',
      sourceOrderNo: 'ML202607200002',
      materialReqId: 'mr-seed-002',
      materialReqNo: 'ML202607200002',
      salesOrderNo: 'SO-2026-0719-008',
      status: '待出库',
      createdAt: '2026-07-20',
      outboundTime: '2026-07-20 10:06:00',
      remark: '领料申请：同销售订单合并领料',
      workOrders: [
        {
          id: 'wo-0720-028',
          code: 'WO-2026-0720-028',
          productName: '排污泵 WQ80-15',
          planQty: 5,
          scheduleQty: 5,
        },
        {
          id: 'wo-0720-022',
          code: 'WO-2026-0720-022',
          productName: '消防泵 XBD5.0/20',
          planQty: 3,
          scheduleQty: 3,
        },
      ],
      lineItems: [
        createOutboundLine({
          id: 'ob-mr-seed-002-l1',
          itemCode: 'M-011',
          itemName: '泵壳',
          shipQty: 8,
          unit: '件',
          shipWarehouse: '原料仓',
          lineSource: '工单领料',
          sourceDocNo: 'ML202607200002',
          sourceWorkOrders: [
            { workOrderId: 'wo-0720-028', workOrderCode: 'WO-2026-0720-028', qty: 5 },
            { workOrderId: 'wo-0720-022', workOrderCode: 'WO-2026-0720-022', qty: 3 },
          ],
        }),
        createOutboundLine({
          id: 'ob-mr-seed-002-l2',
          itemCode: 'M-052',
          itemName: '控制柜',
          shipQty: 8,
          unit: '件',
          shipWarehouse: '原料仓',
          lineSource: '工单领料',
          sourceDocNo: 'ML202607200002',
          sourceWorkOrders: [
            { workOrderId: 'wo-0720-028', workOrderCode: 'WO-2026-0720-028', qty: 5 },
            { workOrderId: 'wo-0720-022', workOrderCode: 'WO-2026-0720-022', qty: 3 },
          ],
        }),
      ],
    }),
    createOutboundOrder({
      id: 'ob-mr-seed-003',
      docNo: 'OUT202607200103',
      outboundType: '领料出库',
      warehouse: '原料仓',
      receiveWarehouse: '线边仓-装配',
      requisitionDept: '装配车间',
      workshop: '装配车间',
      sourceOrderNo: 'ML202607200003',
      materialReqId: 'mr-seed-003',
      materialReqNo: 'ML202607200003',
      status: '已出库',
      createdAt: '2026-07-20',
      completedAt: '2026-07-20',
      outboundTime: '2026-07-20 11:20:00',
      remark: '领料申请：试制补料',
      workOrders: [],
      lineItems: [
        createOutboundLine({
          id: 'ob-mr-seed-003-l1',
          itemCode: 'M-090',
          itemName: '密封垫片',
          shipQty: 4,
          unit: '件',
          shipWarehouse: '原料仓',
          lineSource: '手工添加',
          sourceDocNo: 'ML202607200003',
          lineStatus: '已出库',
        }),
        createOutboundLine({
          id: 'ob-mr-seed-003-l2',
          itemCode: 'M-091',
          itemName: '紧固件套装',
          shipQty: 2,
          unit: '件',
          shipWarehouse: '原料仓',
          lineSource: '手工添加',
          sourceDocNo: 'ML202607200003',
          lineStatus: '已出库',
        }),
      ],
    }),
  ]
}

export function ensureMaterialReqOutboundOrders(orders = []) {
  const seeds = createMaterialReqOutboundOrders()
  const list = [...(orders || [])]
  const indexById = new Map(list.map((o, i) => [o.id, i]))

  seeds.forEach((seed) => {
    const idx = indexById.get(seed.id)
    if (idx == null) {
      list.unshift(seed)
      indexById.set(seed.id, 0)
      return
    }
    const existing = list[idx]
    if (!Array.isArray(existing.workOrders) || !existing.workOrders.length) {
      existing.workOrders = seed.workOrders || []
    }
    if (!existing.materialReqId && seed.materialReqId) {
      existing.materialReqId = seed.materialReqId
      existing.materialReqNo = seed.materialReqNo
    }
  })

  return list
}
