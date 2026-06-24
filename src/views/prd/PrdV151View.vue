<template>
  <PrdDocumentLayout
    :meta="meta"
    :modules="modules"
    version-tag-color="purple"
    :intro="intro"
    fixed-module-tree
  />
</template>

<script>
export default { name: 'PrdV151View' }
</script>

<script setup>
import PrdDocumentLayout from '@/components/prd/PrdDocumentLayout.vue'
import { PRD_V151_META, PRD_V151_MODULES } from '@/data/prdV151'

const meta = PRD_V151_META
const modules = PRD_V151_MODULES

const intro = {
  message: '1.5.1 增量迭代',
  description:
    '本迭代在 1.5 基线之上交付增量需求。左侧模块树固定展示全部业务模块；当前已录入产品工艺模块下 14 条产品 BOM 需求，其余模块待后续补充。云效迭代：淄博泵产业互联网平台-1.5.1。',
}
</script>
