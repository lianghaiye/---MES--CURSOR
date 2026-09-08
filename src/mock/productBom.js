import dayjs from 'dayjs'
import { pumpProductNames, pumpMaterialNames } from '@/mock/pumpIndustryNames'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'

const statuses = ['生效', '待发布', '已归档']
const operators = ['admin', '张三', '李四']

function pickItem(index) {
  if (index % 5 === 0) {
    const name = pumpMaterialNames[index % pumpMaterialNames.length]
    return {
      itemType: 'material',
      itemId: `mat-${String((index % 194) + 1).padStart(4, '0')}`,
      itemName: name,
      itemCode: `WL${String(100001 + (index % 194)).slice(-6)}`,
    }
  }
  const name = pumpProductNames[index % pumpProductNames.length]
  return {
    itemType: 'product',
    itemId: `prod-${String((index % 793) + 1).padStart(5, '0')}`,
    itemName: name,
    itemCode: `CP${String(10001 + (index % 793)).slice(-5)}`,
  }
}

function createBom(index) {
  const year = getBomVersionYear()
  const sub = (index % 4) + 1
  const item = pickItem(index)
  const status = statuses[index % statuses.length]
  const created = dayjs('2026-01-10').add(index % 120, 'day')
  const effective =
    status === '生效' || status === '待发布' ? created.add(1, 'day').format('YYYY-MM-DD HH:mm') : ''
  const groupId = `bom-grp-${Math.floor(index / 3)}`

  return {
    id: `bom-${String(index + 1).padStart(5, '0')}`,
    versionGroupId: groupId,
    bomNo: `BOM${created.format('YYYYMMDD')}${String((index % 900) + 100).padStart(3, '0')}`,
    bomName: `${item.itemName} BOM`,
    ...item,
    version: formatBomVersion(year, sub),
    versionYear: year,
    versionSub: sub,
    status,
    isDefault: status === '生效' && index % 3 !== 1,
    effectiveAt: effective,
    expiredAt: status === '已归档' ? created.add(60, 'day').format('YYYY-MM-DD HH:mm') : '',
    operator: operators[index % operators.length],
    creator: operators[index % operators.length],
    createdAt: created.format('YYYY-MM-DD HH:mm'),
    updatedAt: created.add(index % 10, 'hour').format('YYYY-MM-DD HH:mm'),
    remark: '',
  }
}

export const mockProductBoms = Array.from({ length: 303 }, (_, i) => createBom(i))

import { isShipBomType } from '@/mock/bomMaterialColumns'
import { isShipAttachmentEnabled, normalizeShipAttachmentScope } from '@/utils/shipAttachmentScope'

export function filterProductBoms(list, filters) {
  return list.filter((item) => {
    if (filters.onlyShip && !isShipBomType(item.bomType)) return false
    if (filters.excludeShip && isShipBomType(item.bomType)) return false
    if (filters.bomNo && !item.bomNo.includes(filters.bomNo)) return false
    if (filters.bomName && !item.bomName.includes(filters.bomName)) return false
    if (filters.itemId) {
      if (isShipBomType(item.bomType)) {
        const applicable = Array.isArray(item.applicableProductIds) ? item.applicableProductIds : []
        if (
          !applicable.map(String).includes(String(filters.itemId)) &&
          String(item.itemId) !== String(filters.itemId)
        ) {
          return false
        }
      } else if (item.itemId !== filters.itemId) {
        return false
      }
    }
    if (filters.onlyShip && filters.scopeType) {
      const scope = normalizeShipAttachmentScope(item)
      if (scope.scopeType !== filters.scopeType) return false
    }
    if (filters.status) {
      if (filters.onlyShip) {
        if (filters.status === '启用' && !isShipAttachmentEnabled(item)) return false
        else if (filters.status === '停用' && isShipAttachmentEnabled(item)) return false
        else if (
          filters.status !== '启用' &&
          filters.status !== '停用' &&
          item.status !== filters.status
        ) {
          return false
        }
      } else if (item.status !== filters.status) {
        return false
      }
    }
    if (filters.specModel && !(item.specModel || '').includes(filters.specModel)) return false
    if (filters.material && !(item.material || '').includes(filters.material)) return false
    if (filters.drawingNo && !(item.drawingNo || '').includes(filters.drawingNo)) return false
    return true
  })
}

export function getVersionsInGroup(list, versionGroupId) {
  return list
    .filter((b) => b.versionGroupId === versionGroupId)
    .sort((a, b) => {
      if (a.versionYear !== b.versionYear) return b.versionYear - a.versionYear
      return b.versionSub - a.versionSub
    })
}
