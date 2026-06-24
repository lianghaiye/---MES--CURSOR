<template>
  <div class="prd-page">
    <div class="prd-header">
      <div class="prd-header-main">
        <h1 class="prd-title">{{ meta.title }}</h1>
        <p class="prd-subtitle">{{ meta.project }} · {{ meta.sprint }}</p>
      </div>
      <div class="prd-meta">
        <a-tag color="purple">V{{ meta.version }}</a-tag>
        <span class="meta-item">更新：{{ meta.updatedAt }}</span>
        <span class="meta-item">需求负责人：{{ meta.requirementOwner }}</span>
        <span class="meta-item">验收负责人：{{ meta.acceptanceOwner }}</span>
      </div>
    </div>

    <a-alert
      type="info"
      show-icon
      class="prd-intro"
      message="云效建需求说明"
      description="共 14 条产品 BOM 需求，每条对应云效迭代「淄博泵产业互联网平台-1.5.1」中的一个工作项。Markdown 原文见 docs/yunxiao/淄博泵产业互联网平台-1.5.1-产品BOM需求.md，可复制到云效描述中。"
    />

    <a-input-search
      v-model:value="keyword"
      placeholder="搜索需求编号或标题"
      allow-clear
      class="prd-search"
    />

    <a-table
      :columns="columns"
      :data-source="filteredRequirements"
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }"
      :scroll="{ x: 1200 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'title'">
          <a class="req-link" @click.prevent="scrollToReq(record.id)">{{ record.title }}</a>
        </template>
      </template>
    </a-table>

    <section v-for="req in filteredRequirements" :id="req.id" :key="req.id" class="req-card">
      <div class="req-card-head">
        <h3>{{ req.id }} {{ req.title }}</h3>
        <a-space>
          <a-tag>{{ req.priority }}</a-tag>
          <a-tag :color="statusColor(req.status)">{{ statusLabel(req.status) }}</a-tag>
        </a-space>
      </div>
      <a-descriptions bordered size="small" :column="2" class="req-desc">
        <a-descriptions-item label="需求负责人">{{ req.requirementOwner }}</a-descriptions-item>
        <a-descriptions-item label="验收负责人">{{ req.acceptanceOwner }}</a-descriptions-item>
      </a-descriptions>
      <div class="field-block">
        <div class="field-label">背景</div>
        <p>{{ req.background }}</p>
      </div>
      <div class="field-block">
        <div class="field-label">功能描述</div>
        <ul>
          <li v-for="(line, i) in req.description" :key="i">{{ line }}</li>
        </ul>
      </div>
      <div class="field-block">
        <div class="field-label">业务规则</div>
        <ul>
          <li v-for="(line, i) in req.rules" :key="i">{{ line }}</li>
        </ul>
      </div>
      <div class="field-block">
        <div class="field-label">验收标准</div>
        <ul>
          <li v-for="(line, i) in req.acceptance" :key="i">{{ line }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script>
export default { name: 'PrdV151ProductBomView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { PRD_V151_META, PRD_V151_PRODUCT_BOM_REQUIREMENTS } from '@/data/prdV151ProductBom'

const meta = PRD_V151_META
const keyword = ref('')

const columns = [
  { title: '编号', dataIndex: 'id', key: 'id', width: 110 },
  { title: '需求标题', key: 'title', width: 220, ellipsis: true },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 72 },
  { title: '状态', key: 'status', width: 88 },
  { title: '需求负责人', dataIndex: 'requirementOwner', key: 'requirementOwner', width: 100 },
  { title: '验收负责人', dataIndex: 'acceptanceOwner', key: 'acceptanceOwner', width: 100 },
]

const filteredRequirements = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return PRD_V151_PRODUCT_BOM_REQUIREMENTS
  return PRD_V151_PRODUCT_BOM_REQUIREMENTS.filter(
    (r) =>
      r.id.toLowerCase().includes(kw) ||
      r.title.toLowerCase().includes(kw) ||
      r.description.some((d) => d.toLowerCase().includes(kw)),
  )
})

function statusLabel(status) {
  return { done: '已实现', partial: '部分实现', planned: '规划中' }[status] || status
}

function statusColor(status) {
  return { done: 'success', partial: 'warning', planned: 'default' }[status] || 'default'
}

function scrollToReq(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style lang="less" scoped>
.prd-page {
  margin: -12px;
  padding: 16px 20px 32px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.prd-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
}

.prd-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
}

.prd-subtitle {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.prd-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.prd-intro {
  margin-bottom: 12px;
}

.prd-search {
  max-width: 320px;
  margin-bottom: 12px;
}

.req-link {
  color: #1677ff;
  cursor: pointer;
}

.req-card {
  margin-top: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
}

.req-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
  }
}

.req-desc {
  margin-bottom: 12px;
}

.field-block {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;

  ul {
    margin: 4px 0 0;
    padding-left: 20px;
  }
}

.field-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 4px;
}
</style>
