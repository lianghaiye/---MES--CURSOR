import dayjs from 'dayjs'
import { createEmptyGrid } from '@/utils/processRouteGrid'

function cell(processId, processFileId = '') {
  return processFileId ? { processId, processFileId } : { processId }
}

function buildGrid(pairs) {
  const maxStep = Math.max(...pairs.map(([s]) => s), 0)
  const maxRow = Math.max(...pairs.map(([, r]) => r), 0)
  const grid = createEmptyGrid(maxStep, maxRow)
  pairs.forEach(([step, row, processId, fileId]) => {
    grid[step - 1][row - 1] = cell(processId, fileId)
  })
  return grid
}

/** 机泵行业常用工艺路线种子 */
export function createProcessRouteSeed(getProcessIdByName) {
  const p = getProcessIdByName
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  const routes = [
    {
      id: 'route-001',
      code: 'GYLX0001',
      name: '离心泵标准装配路线',
      status: '使用中',
      applyScope: '全部产品',
      productDisplay: '',
      remark: '机泵行业通用离心泵装配',
      grid: buildGrid([
        [1, 1, p('领料'), 'pdoc-001'],
        [2, 1, p('叶轮装配'), 'pdoc-003'],
        [3, 1, p('密封装配')],
        [4, 1, p('轴承装配')],
        [5, 1, p('总装'), 'pdoc-001'],
        [6, 1, p('调试'), 'pdoc-002'],
        [7, 1, p('试压')],
        [8, 1, p('质检'), 'pdoc-005'],
        [9, 1, p('入库'), 'pdoc-006'],
      ]),
    },
    {
      id: 'route-002',
      code: 'GYLX0002',
      name: '潜水泵组装路线',
      status: '使用中',
      applyScope: '物品类别',
      categoryType: '产品',
      categoryKey: 'pcat-004-003',
      categoryName: '电机泵',
      productDisplay: '电机泵',
      remark: '',
      grid: buildGrid([
        [1, 1, p('领料')],
        [2, 1, p('总装')],
        [3, 1, p('灌胶')],
        [4, 1, p('调试'), 'pdoc-002'],
        [5, 1, p('质检'), 'pdoc-005'],
        [6, 1, p('入库')],
      ]),
    },
    {
      id: 'route-003',
      code: 'GYLX0003',
      name: '泵体机加路线',
      status: '使用中',
      applyScope: '物品类别',
      categoryType: '物料',
      categoryKey: 'cat-005',
      categoryName: '零件',
      productDisplay: '零件',
      grid: buildGrid([
        [1, 1, p('下料'), 'pdoc-004'],
        [2, 1, p('车加工')],
        [3, 1, p('钻孔')],
        [4, 1, p('铣削')],
        [5, 1, p('质检')],
        [6, 1, p('入库')],
      ]),
    },
    {
      id: 'route-004',
      code: 'GYLX0004',
      name: '多级泵装配路线',
      status: '使用中',
      applyScope: '全部产品',
      productDisplay: '',
      grid: buildGrid([
        [1, 1, p('领料')],
        [2, 1, p('叶轮装配')],
        [3, 1, p('总装')],
        [4, 1, p('动平衡')],
        [5, 1, p('试压')],
        [6, 1, p('质检')],
        [7, 1, p('入库')],
      ]),
    },
    {
      id: 'route-005',
      code: 'GYLX0005',
      name: '深井泵调试入库路线',
      status: '使用中',
      applyScope: '单个物品',
      itemType: '产品',
      itemId: 'prod-00001',
      itemName: '深井潜水泵',
      itemCode: 'CP2610004',
      productDisplay: '深井潜水泵',
      grid: buildGrid([
        [1, 1, p('调试'), 'pdoc-002'],
        [2, 1, p('试压')],
        [3, 1, p('质检'), 'pdoc-005'],
        [4, 1, p('入库')],
      ]),
    },
    {
      id: 'route-006',
      code: 'GYLX0006',
      name: '拆解返修路线',
      status: '使用中',
      applyScope: '全部产品',
      productDisplay: '',
      grid: buildGrid([
        [1, 1, p('拆解')],
        [2, 1, p('拆解质检')],
        [3, 1, p('入库')],
      ]),
    },
    {
      id: 'route-007',
      code: 'GYLX0007',
      name: '打孔质检入库888',
      status: '使用中',
      applyScope: '全部产品',
      productDisplay: '',
      grid: buildGrid([
        [1, 1, p('打孔')],
        [2, 1, p('质检')],
        [3, 1, p('入库')],
      ]),
    },
    {
      id: 'route-008',
      code: 'GYLX0008',
      name: '测试质检',
      status: '已归档',
      applyScope: '全部产品',
      productDisplay: '',
      remark: '历史测试路线',
      grid: buildGrid([
        [1, 1, p('试压')],
        [2, 1, p('质检')],
      ]),
    },
  ]

  return routes.map((r, i) => ({
    ...r,
    createdAt: dayjs('2026-05-01').add(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: now,
  }))
}
