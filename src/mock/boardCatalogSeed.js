/** 看板台账种子：系统内可轮播看板 */
export function createBoardCatalogSeed() {
  const now = '2026-09-15 10:00:00'
  return [
    {
      id: 'board-wo-monitor',
      code: 'work-order-monitor',
      name: '工单监管看板',
      playPath: '/board/work-order-monitor/screen',
      enabled: true,
      updatedAt: now,
    },
  ]
}
