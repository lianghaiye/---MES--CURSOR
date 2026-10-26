/** 看板台账种子：系统内可轮播看板 */
export function createBoardCatalogSeed() {
  const now = '2026-10-22 12:00:00'
  return [
    {
      id: 'board-wo-monitor',
      code: 'work-order-monitor',
      name: '工单监管看板',
      playPath: '/board/work-order-monitor/screen',
      enabled: true,
      updatedAt: now,
    },
    {
      id: 'board-kit-supply',
      code: 'kit-supply',
      name: '齐套与供应看板',
      playPath: '/board/kit-supply/screen',
      enabled: true,
      updatedAt: now,
    },
  ]
}
