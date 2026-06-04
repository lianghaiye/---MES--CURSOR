/** 演示用行级 / 整单配件包（订单维护，发运时手动勾选） */

function kitItem(partial) {
  return {
    id: `ap-item-${Math.random().toString(36).slice(2, 8)}`,
    materialCode: '',
    name: '',
    spec: '',
    unit: '件',
    qtyPerKit: 1,
    stockQty: 0,
    ...partial,
  }
}

const LINE_KIT_DEFS = [
  {
    kitCode: 'TOOL-STD',
    kitName: '安装工具包',
    items: [
      kitItem({ materialCode: 'TOOL-WRENCH', name: '专用扳手组', spec: 'M8-M24', unit: '套', qtyPerKit: 1, stockQty: 12 }),
      kitItem({ materialCode: 'TOOL-SEAL', name: '密封脂', spec: '500g', unit: '桶', qtyPerKit: 2, stockQty: 40 }),
    ],
  },
  {
    kitCode: 'SPARE-STD',
    kitName: '易损备件包',
    items: [
      kitItem({ materialCode: 'SPARE-ORING', name: 'O型密封圈', spec: 'NBR-50', unit: '个', qtyPerKit: 10, stockQty: 200 }),
      kitItem({ materialCode: 'SPARE-FUSE', name: '保险丝', spec: '10A', unit: '个', qtyPerKit: 5, stockQty: 80 }),
    ],
  },
]

const ORDER_KIT_DEFS = [
  {
    kitCode: 'DOC-STD',
    kitName: '随货资料包',
    items: [
      kitItem({ materialCode: 'DOC-MANUAL', name: '产品说明书', spec: '中文版', unit: '册', qtyPerKit: 1, stockQty: 500 }),
      kitItem({ materialCode: 'DOC-CERT', name: '合格证', spec: 'A4', unit: '份', qtyPerKit: 1, stockQty: 500 }),
    ],
  },
  {
    kitCode: 'PKG-STD',
    kitName: '外包装辅材',
    items: [
      kitItem({ materialCode: 'PKG-TAPE', name: '封箱胶带', spec: '48mm', unit: '卷', qtyPerKit: 2, stockQty: 60 }),
      kitItem({ materialCode: 'PKG-LABEL', name: '运输标签', spec: '防水', unit: '张', qtyPerKit: 4, stockQty: 300 }),
    ],
  },
]

function cloneKitDef(def, prefix) {
  return {
    id: `${prefix}-${def.kitCode}`,
    kitCode: def.kitCode,
    kitName: def.kitName,
    items: def.items.map((it) => ({
      ...it,
      id: `${prefix}-${def.kitCode}-${it.materialCode}`,
    })),
  }
}

export function buildLineAccessoryKits(line) {
  const suffix = line?.id || line?.productCode || 'line'
  return LINE_KIT_DEFS.map((def) => cloneKitDef(def, `lak-${suffix}`))
}

export function buildOrderAccessoryKits() {
  return ORDER_KIT_DEFS.map((def) => cloneKitDef(def, 'oak-order'))
}
