<template>
  <div class="prd-index">
    <div class="index-header">
      <div>
        <h1 class="index-title">{{ meta.title }}</h1>
        <p class="index-subtitle">{{ meta.subtitle }}</p>
      </div>
      <span class="index-updated">更新：{{ meta.updatedAt }}</span>
    </div>

    <a-alert
      type="info"
      show-icon
      class="index-intro"
      message="全量需求文档"
      description="本页汇总 IDOMS 各迭代版本的需求文档入口。点击卡片进入对应版本 PRD，查看按业务模块组织的功能说明与业务规则。"
    />

    <div class="iteration-grid">
      <router-link
        v-for="item in iterations"
        :key="item.version"
        :to="item.path"
        class="iteration-card"
      >
        <div class="card-head">
          <a-tag :color="statusColor(item.status)">V{{ item.version }}</a-tag>
          <a-tag>{{ statusLabel(item.status) }}</a-tag>
        </div>
        <h2 class="card-title">{{ item.title }}</h2>
        <p class="card-sprint">{{ item.sprint }}</p>
        <p class="card-summary">{{ item.summary }}</p>
        <div class="card-stats">
          <span>{{ item.moduleCount }} 个模块</span>
          <span>{{ item.featureCount }} 条功能/需求</span>
          <span>更新 {{ item.updatedAt }}</span>
        </div>
        <div class="card-scope">{{ item.scope }}</div>
        <div class="card-link">查看需求文档 →</div>
      </router-link>
    </div>

    <section v-for="section in docSections" :key="section.key" class="doc-section">
      <h3 class="section-title">{{ section.title }}</h3>
      <ul>
        <li v-for="(line, i) in section.items" :key="i">{{ line }}</li>
      </ul>
    </section>
  </div>
</template>

<script>
export default { name: 'PrdIndexView' }
</script>

<script setup>
import {
  PRD_INDEX_META,
  PRD_ITERATIONS,
  PRD_DOC_SECTIONS,
} from '@/data/prdIndex'

const meta = PRD_INDEX_META
const iterations = PRD_ITERATIONS
const docSections = PRD_DOC_SECTIONS

function statusLabel(status) {
  return { released: '已发布', active: '进行中', planned: '规划中' }[status] || status
}

function statusColor(status) {
  return { released: 'blue', active: 'purple', planned: 'default' }[status] || 'blue'
}
</script>

<style lang="less" scoped>
.prd-index {
  margin: -12px;
  padding: 20px 24px 32px;
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}

.index-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
}

.index-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.index-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 13px;
}

.index-updated {
  font-size: 12px;
  color: #999;
}

.index-intro {
  margin-bottom: 20px;
}

.iteration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.iteration-card {
  display: block;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s, transform 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.12);
    transform: translateY(-2px);
  }
}

.card-head {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.card-title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: #1a1a2e;
}

.card-sprint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #888;
}

.card-summary {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #555;
}

.card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.card-scope {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 12px;
}

.card-link {
  font-size: 13px;
  color: #1677ff;
  font-weight: 500;
}

.doc-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 12px;

  ul {
    margin: 8px 0 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.75;
    color: #444;
  }
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
</style>
