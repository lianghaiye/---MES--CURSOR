<template>
  <div class="prd-page">
    <div class="prd-header">
      <div class="prd-header-main">
        <h1 class="prd-title">{{ meta.title }}</h1>
        <p class="prd-subtitle">{{ meta.project }} · {{ meta.sprint }}</p>
      </div>
      <div class="prd-meta">
        <a-tag color="blue">V{{ meta.version }}</a-tag>
        <span class="meta-item">更新：{{ meta.updatedAt }}</span>
        <span class="meta-item">范围：{{ meta.scope }}</span>
      </div>
    </div>

    <a-layout class="prd-layout">
      <a-layout-sider width="220" class="prd-sider" theme="light">
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索模块或功能"
          allow-clear
          class="prd-search"
        />
        <a-anchor :affix="false" :items="anchorItems" @click="onAnchorClick" />
      </a-layout-sider>

      <a-layout-content class="prd-content">
        <a-alert
          type="info"
          show-icon
          class="prd-intro"
          message="文档说明"
          description="本文档整理 I-DOMS 系统 1.5 版本迭代全部功能模块需求，包含背景、功能描述、业务规则及业务流程（如有）。状态标签：已实现、部分实现、规划中。"
        />

        <section v-if="filteredModules.length === 0" class="empty-hint">
          未找到匹配的模块或功能
        </section>

        <section v-for="mod in filteredModules" :id="mod.key" :key="mod.key" class="module-section">
          <h2 class="module-title">{{ mod.label }}</h2>

          <div
            v-for="(feat, idx) in mod.features"
            :id="`${mod.key}-${idx}`"
            :key="feat.name"
            class="feature-card"
          >
            <div class="feature-head">
              <h3 class="feature-name">{{ feat.name }}</h3>
              <a-tag :color="statusColor(feat.status)">{{ statusLabel(feat.status) }}</a-tag>
            </div>

            <div class="field-block">
              <div class="field-label">背景</div>
              <div class="field-body">
                <p v-if="typeof feat.background === 'string'">{{ feat.background }}</p>
                <ul v-else>
                  <li v-for="(line, i) in feat.background" :key="i">{{ line }}</li>
                </ul>
              </div>
            </div>

            <div class="field-block">
              <div class="field-label">功能描述</div>
              <div class="field-body">
                <ul>
                  <li v-for="(line, i) in asList(feat.description)" :key="i">{{ line }}</li>
                </ul>
              </div>
            </div>

            <div class="field-block">
              <div class="field-label">业务规则</div>
              <div class="field-body">
                <ul>
                  <li v-for="(line, i) in asList(feat.rules)" :key="i">{{ line }}</li>
                </ul>
              </div>
            </div>

            <div v-if="feat.process" class="field-block">
              <div class="field-label">业务流程</div>
              <div class="field-body process-body">
                <template v-if="typeof feat.process === 'string'">
                  <a-steps direction="vertical" size="small" :current="-1">
                    <a-step
                      v-for="(step, i) in feat.process.split('→').map((s) => s.trim())"
                      :key="i"
                      :title="step"
                    />
                  </a-steps>
                </template>
                <ul v-else>
                  <li v-for="(line, i) in feat.process" :key="i">{{ line }}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="wage-formulas" class="module-section">
          <h2 class="module-title">附录：工资核算公式</h2>
          <div class="feature-card">
            <div v-for="item in wageFormulas" :key="item.title" class="formula-item">
              <div class="formula-title">{{ item.title }}</div>
              <div class="formula-text">{{ item.formula }}</div>
            </div>
          </div>
        </section>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script>
export default { name: 'PrdV15View' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { PRD_V15_META, PRD_V15_MODULES, PRD_V15_WAGE_FORMULAS } from '@/data/prdV15'

const meta = PRD_V15_META
const wageFormulas = PRD_V15_WAGE_FORMULAS
const keyword = ref('')

function asList(val) {
  return Array.isArray(val) ? val : [val]
}

function statusLabel(status) {
  const map = { done: '已实现', partial: '部分实现', planned: '规划中' }
  return map[status] || '已实现'
}

function statusColor(status) {
  const map = { done: 'success', partial: 'warning', planned: 'default' }
  return map[status] || 'success'
}

const filteredModules = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return PRD_V15_MODULES
  return PRD_V15_MODULES.map((mod) => ({
    ...mod,
    features: mod.features.filter(
      (f) =>
        mod.label.toLowerCase().includes(kw) ||
        f.name.toLowerCase().includes(kw) ||
        asList(f.description).some((d) => d.toLowerCase().includes(kw)) ||
        asList(f.rules).some((r) => r.toLowerCase().includes(kw)),
    ),
  })).filter((mod) => mod.features.length > 0)
})

const anchorItems = computed(() => {
  const items = filteredModules.value.flatMap((mod) => [
    { key: mod.key, href: `#${mod.key}`, title: mod.label },
    ...mod.features.map((feat, idx) => ({
      key: `${mod.key}-${idx}`,
      href: `#${mod.key}-${idx}`,
      title: feat.name,
    })),
  ])
  items.push({ key: 'wage-formulas', href: '#wage-formulas', title: '工资公式附录' })
  return items
})

function onAnchorClick(e, link) {
  e.preventDefault()
  const el = document.querySelector(link.href)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style lang="less" scoped>
.prd-page {
  min-height: calc(100vh - 120px);
  background: #f5f7fa;
}

.prd-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  background: #fff;
  border-bottom: 1px solid #eef0f3;
  margin-bottom: 16px;
}

.prd-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
}

.prd-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 13px;
}

.prd-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.meta-item {
  font-size: 12px;
  color: #888;
}

.prd-layout {
  background: transparent;
  padding: 0 16px 24px;
}

.prd-sider {
  background: #fff !important;
  border-radius: 8px;
  padding: 12px;
  margin-right: 16px;
  position: sticky;
  top: 12px;
  align-self: flex-start;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.prd-search {
  margin-bottom: 12px;
}

.prd-content {
  background: transparent;
  min-width: 0;
}

.prd-intro {
  margin-bottom: 16px;
}

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

.feature-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.feature-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.field-block {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
  margin-bottom: 6px;
}

.field-body {
  font-size: 13px;
  line-height: 1.7;
  color: #444;

  ul {
    margin: 0;
    padding-left: 20px;
  }

  li + li {
    margin-top: 4px;
  }

  p {
    margin: 0;
  }
}

.process-body {
  padding-left: 4px;
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

.empty-hint {
  text-align: center;
  padding: 48px;
  color: #999;
  background: #fff;
  border-radius: 8px;
}

:deep(.ant-anchor-link-title) {
  font-size: 12px;
}
</style>
