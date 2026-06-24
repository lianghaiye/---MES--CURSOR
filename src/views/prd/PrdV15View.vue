<template>
  <PrdDocumentLayout
    :meta="meta"
    :modules="modules"
    :intro="intro"
    :appendix-items="appendixItems"
    fixed-module-tree
  >
    <template #appendix>
      <section id="wage-formulas" class="module-section">
        <h2 class="module-title">附录：工资核算公式</h2>
        <div class="feature-card">
          <div v-for="item in wageFormulas" :key="item.title" class="formula-item">
            <div class="formula-title">{{ item.title }}</div>
            <div class="formula-text">{{ item.formula }}</div>
          </div>
        </div>
      </section>
    </template>
  </PrdDocumentLayout>
</template>

<script>
export default { name: 'PrdV15View' }
</script>

<script setup>
import PrdDocumentLayout from '@/components/prd/PrdDocumentLayout.vue'
import { PRD_V15_META, PRD_V15_MODULES, PRD_V15_WAGE_FORMULAS } from '@/data/prdV15'

const meta = PRD_V15_META
const modules = PRD_V15_MODULES
const wageFormulas = PRD_V15_WAGE_FORMULAS

const intro = {
  message: '文档说明',
  description:
    '本文档整理 I-DOMS 机泵1.5 版本迭代全部功能模块需求，描述风格对齐飞书 PRD（背景、功能描述、业务规则、业务流程、验收标准）。状态：已实现 / 部分实现 / 规划中。产品 BOM 增量需求见 1.5.1 迭代文档。',
}

const appendixItems = [{ key: 'wage-formulas', href: '#wage-formulas', title: '工资公式附录' }]
</script>

<style lang="less" scoped>
.module-section {
  margin-bottom: 24px;
}

.module-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 4px solid #1677ff;
}

.feature-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.formula-item {
  padding: 10px 0;
  border-bottom: 1px dashed #eee;

  &:last-child {
    border-bottom: none;
  }
}

.formula-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  color: #333;
}

.formula-text {
  font-size: 13px;
  color: #555;
  line-height: 1.6;
  font-family: 'SF Mono', Menlo, monospace;
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 4px;
}
</style>
