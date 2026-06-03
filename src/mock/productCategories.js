/** 产品类别树 */
export const productCategoryTree = [
  { key: 'pcat-008', code: '008', title: '清水泵' },
  { key: 'pcat-pc', code: 'pc', title: '电脑' },
  {
    key: 'pcat-004',
    code: '004',
    title: '离心泵',
    children: [
      { key: 'pcat-004-001', code: '001', title: '泵体', parentKey: 'pcat-004' },
      { key: 'pcat-004-002', code: '002', title: '壳体', parentKey: 'pcat-004' },
      { key: 'pcat-004-003', code: '003', title: '电机泵', parentKey: 'pcat-004' },
    ],
  },
]

export { filterCategoryTree, flattenCategoryNodes } from '@/mock/materialCategories'
