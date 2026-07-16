import dayjs from 'dayjs'
import { defaultPackagingSkuCodePattern } from '@/constants/packagingSpu'
import { DEFAULT_PACKAGING_VARIANT_AXES } from '@/constants/packagingSpu'

export function normalizePackagingSpu(item = {}) {
  const variantAxes = item.variantAxes?.length
    ? item.variantAxes
    : JSON.parse(JSON.stringify(DEFAULT_PACKAGING_VARIANT_AXES))
  return {
    id: item.id,
    code: item.code || '',
    name: item.name || '',
    canSell: Boolean(item.canSell),
    canPurchase: Boolean(item.canPurchase),
    variantAxes,
    skuCodePattern: item.skuCodePattern || defaultPackagingSkuCodePattern(variantAxes),
    enabledCombinations: item.enabledCombinations || [],
    creator: item.creator || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  }
}

export function createPackagingSpuSeed() {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return [
    normalizePackagingSpu({
      id: 'pkg-spu-1',
      code: 'T-BZ-001',
      name: '标准纸箱',
      canSell: true,
      canPurchase: false,
      variantAxes: [
        {
          key: 'packagingForm',
          label: '包装形式',
          code: 'FORM',
          required: true,
          source: 'enum',
          enumValues: [{ name: '纸箱', code: '纸箱' }],
        },
        {
          key: 'outerSize',
          label: '外包装尺寸',
          code: 'SIZE',
          required: true,
          source: 'enum',
          enumValues: [
            { name: '600×400×300', code: '600400300' },
            { name: '800×600×400', code: '800600400' },
          ],
        },
        {
          key: 'capacityQty',
          label: '标准包装量',
          code: 'QTY',
          required: true,
          source: 'enum',
          enumValues: [{ name: '1', code: '1' }],
        },
        {
          key: 'unit',
          label: '单位',
          code: 'UNIT',
          required: true,
          source: 'enum',
          enumValues: [{ name: '箱', code: '箱' }],
        },
      ],
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    }),
    normalizePackagingSpu({
      id: 'pkg-spu-2',
      code: 'T-BZ-002',
      name: '出口木箱',
      canSell: true,
      canPurchase: true,
      variantAxes: [
        {
          key: 'packagingForm',
          label: '包装形式',
          code: 'FORM',
          required: true,
          source: 'enum',
          enumValues: [{ name: '木箱', code: '木箱' }],
        },
        {
          key: 'outerSize',
          label: '外包装尺寸',
          code: 'SIZE',
          required: true,
          source: 'enum',
          enumValues: [
            { name: '1200×800×600', code: '1200800600' },
            { name: '1400×900×700', code: '1400900700' },
          ],
        },
        {
          key: 'capacityQty',
          label: '标准包装量',
          code: 'QTY',
          required: true,
          source: 'enum',
          enumValues: [
            { name: '4', code: '4' },
            { name: '8', code: '8' },
          ],
        },
        {
          key: 'unit',
          label: '单位',
          code: 'UNIT',
          required: true,
          source: 'enum',
          enumValues: [{ name: '箱', code: '箱' }],
        },
      ],
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    }),
    normalizePackagingSpu({
      id: 'pkg-spu-3',
      code: 'T-BZ-003',
      name: '托盘包装',
      canSell: false,
      canPurchase: true,
      variantAxes: [
        {
          key: 'packagingForm',
          label: '包装形式',
          code: 'FORM',
          required: true,
          source: 'enum',
          enumValues: [{ name: '托盘', code: '托盘' }],
        },
        {
          key: 'outerSize',
          label: '外包装尺寸',
          code: 'SIZE',
          required: true,
          source: 'enum',
          enumValues: [{ name: '1200×1000×150', code: '12001000150' }],
        },
        {
          key: 'capacityQty',
          label: '标准包装量',
          code: 'QTY',
          required: true,
          source: 'enum',
          enumValues: [{ name: '20', code: '20' }],
        },
        {
          key: 'unit',
          label: '单位',
          code: 'UNIT',
          required: true,
          source: 'enum',
          enumValues: [{ name: '托', code: '托' }],
        },
      ],
      creator: '张三',
      createdAt: now,
      updatedAt: now,
    }),
    normalizePackagingSpu({
      id: 'pkg-spu-4',
      code: 'T-BZ-004',
      name: '配件袋装',
      canSell: true,
      canPurchase: true,
      variantAxes: [
        {
          key: 'packagingForm',
          label: '包装形式',
          code: 'FORM',
          required: true,
          source: 'enum',
          enumValues: [{ name: '袋装', code: '袋装' }],
        },
        {
          key: 'outerSize',
          label: '外包装尺寸',
          code: 'SIZE',
          required: true,
          source: 'enum',
          enumValues: [{ name: '400×300×50', code: '40030050' }],
        },
        {
          key: 'capacityQty',
          label: '标准包装量',
          code: 'QTY',
          required: true,
          source: 'enum',
          enumValues: [{ name: '10', code: '10' }],
        },
        {
          key: 'unit',
          label: '单位',
          code: 'UNIT',
          required: true,
          source: 'enum',
          enumValues: [{ name: '袋', code: '袋' }],
        },
      ],
      creator: '李四',
      createdAt: now,
      updatedAt: now,
    }),
  ]
}
