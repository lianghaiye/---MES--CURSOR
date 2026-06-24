<template>
  <div class="prd-page">
    <div class="prd-header">
      <div class="prd-header-main">
        <h1 class="prd-title">{{ meta.title }}</h1>
        <p class="prd-subtitle">{{ meta.project }} · {{ meta.sprint }}</p>
      </div>
      <div class="prd-meta">
        <a-tag :color="versionTagColor">V{{ meta.version }}</a-tag>
        <span v-if="meta.updatedAt" class="meta-item">更新：{{ meta.updatedAt }}</span>
        <span v-if="meta.scope" class="meta-item">范围：{{ meta.scope }}</span>
        <span v-if="meta.requirementOwner" class="meta-item">
          需求负责人：{{ meta.requirementOwner }}
        </span>
        <span v-if="meta.acceptanceOwner" class="meta-item">
          验收负责人：{{ meta.acceptanceOwner }}
        </span>
        <slot name="meta-extra" />
      </div>
    </div>

    <div class="prd-body">
      <aside class="prd-sider">
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索模块或功能"
          allow-clear
          class="prd-search"
        />
        <div class="sider-tree">
          <div
            v-for="mod in displayModules"
            :key="mod.key"
            class="tree-module"
          >
            <a
              href="#"
              class="tree-module-title"
              @click.prevent="scrollTo(`#${mod.key}`)"
            >
              {{ mod.label }}
              <span v-if="mod.features.length" class="tree-count">{{ mod.features.length }}</span>
            </a>
            <a
              v-for="(feat, idx) in mod.features"
              :key="featAnchorId(mod, feat, idx)"
              href="#"
              class="tree-feature"
              @click.prevent="scrollTo(`#${featAnchorId(mod, feat, idx)}`)"
            >
              {{ featLabel(feat) }}
            </a>
          </div>
          <div v-if="appendixItems.length" class="tree-module">
            <a
              v-for="item in appendixItems"
              :key="item.key"
              href="#"
              class="tree-module-title"
              @click.prevent="scrollTo(item.href)"
            >
              {{ item.title }}
            </a>
          </div>
        </div>
      </aside>

      <main ref="contentRef" class="prd-content">
        <a-alert
          v-if="intro"
          type="info"
          show-icon
          class="prd-intro"
          :message="intro.message"
          :description="intro.description"
        />

        <section v-if="filteredModules.length === 0" class="empty-hint">
          未找到匹配的模块或功能
        </section>

        <section
          v-for="mod in filteredModules"
          :id="mod.key"
          :key="mod.key"
          class="module-section"
        >
          <h2 class="module-title">{{ mod.label }}</h2>

          <div
            v-if="!mod.features.length"
            class="feature-card feature-empty"
          >
            本迭代该模块暂无需求条目，后续迭代补充后将在此展示。
          </div>

          <div
            v-for="(feat, idx) in mod.features"
            :id="featAnchorId(mod, feat, idx)"
            :key="featAnchorId(mod, feat, idx)"
            class="feature-card"
          >
            <div class="feature-head">
              <h3 class="feature-name">
                <span v-if="feat.id" class="feat-id">{{ feat.id }}</span>
                {{ feat.name }}
              </h3>
              <a-space wrap>
                <a-tag v-if="feat.priority" color="blue">{{ feat.priority }}</a-tag>
                <a-tag :color="statusColor(feat.status)">{{ statusLabel(feat.status) }}</a-tag>
              </a-space>
            </div>

            <a-descriptions
              v-if="feat.requirementOwner || feat.acceptanceOwner"
              bordered
              size="small"
              :column="2"
              class="feat-owners"
            >
              <a-descriptions-item v-if="feat.requirementOwner" label="需求负责人">
                {{ feat.requirementOwner }}
              </a-descriptions-item>
              <a-descriptions-item v-if="feat.acceptanceOwner" label="验收负责人">
                {{ feat.acceptanceOwner }}
              </a-descriptions-item>
            </a-descriptions>

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

            <div v-if="feat.acceptance?.length" class="field-block">
              <div class="field-label">验收标准</div>
              <div class="field-body">
                <ul class="acceptance-list">
                  <li v-for="(line, i) in feat.acceptance" :key="i">{{ line }}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <slot name="appendix" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  meta: { type: Object, required: true },
  modules: { type: Array, required: true },
  intro: { type: Object, default: null },
  appendixItems: { type: Array, default: () => [] },
  versionTagColor: { type: String, default: 'blue' },
  /** 侧栏始终展示完整模块树，不受搜索过滤 */
  fixedModuleTree: { type: Boolean, default: true },
})

const keyword = ref('')
const contentRef = ref(null)

function asList(val) {
  return Array.isArray(val) ? val : [val]
}

function statusLabel(status) {
  return { done: '已实现', partial: '部分实现', planned: '规划中' }[status] || '已实现'
}

function statusColor(status) {
  return { done: 'success', partial: 'warning', planned: 'default' }[status] || 'success'
}

function featAnchorId(mod, feat, idx) {
  return feat.id || `${mod.key}-${idx}`
}

function featLabel(feat) {
  return feat.id ? `${feat.id} ${feat.title || feat.name}` : feat.name
}

const filteredModules = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.modules
  return props.modules
    .map((mod) => ({
      ...mod,
      features: mod.features.filter(
        (f) =>
          mod.label.toLowerCase().includes(kw) ||
          (f.id && f.id.toLowerCase().includes(kw)) ||
          f.name.toLowerCase().includes(kw) ||
          (f.title && f.title.toLowerCase().includes(kw)) ||
          asList(f.description).some((d) => d.toLowerCase().includes(kw)) ||
          asList(f.rules).some((r) => r.toLowerCase().includes(kw)),
      ),
    }))
    .filter((mod) => mod.features.length > 0)
})

const displayModules = computed(() =>
  props.fixedModuleTree ? props.modules : filteredModules.value,
)

function scrollTo(selector) {
  const root = contentRef.value
  const el = root?.querySelector(selector) || document.querySelector(selector)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style lang="less" scoped>
.prd-page {
  margin: -12px;
  height: calc(100vh - 56px - 40px - 24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

.prd-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #eef0f3;
}

.prd-title {
  margin: 0;
  font-size: 20px;
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
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  flex-shrink: 0;
  max-width: 520px;
  justify-content: flex-end;
}

.meta-item {
  font-size: 12px;
  color: #888;
}

.prd-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: 12px 16px 16px;
  gap: 16px;
}

.prd-sider {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.prd-search {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.sider-tree {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.tree-module {
  margin-bottom: 8px;
}

.tree-module-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  padding: 6px 8px;
  border-radius: 4px;
  text-decoration: none;

  &:hover {
    background: #f0f5ff;
    color: #1677ff;
  }
}

.tree-count {
  font-size: 11px;
  font-weight: 400;
  color: #999;
  background: #f5f5f5;
  padding: 0 6px;
  border-radius: 10px;
}

.tree-feature {
  display: block;
  font-size: 12px;
  color: #666;
  padding: 4px 8px 4px 16px;
  line-height: 1.5;
  text-decoration: none;
  border-left: 2px solid transparent;

  &:hover {
    color: #1677ff;
    background: #fafafa;
    border-left-color: #1677ff;
  }
}

.prd-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding-right: 4px;
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

.feature-empty {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding: 32px;
}

.feature-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.feature-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.feat-id {
  color: #1677ff;
  margin-right: 6px;
}

.feat-owners {
  margin-bottom: 14px;
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
  line-height: 1.75;
  color: #444;

  ul {
    margin: 0;
    padding-left: 20px;
  }

  li + li {
    margin-top: 6px;
  }

  p {
    margin: 0;
  }
}

.acceptance-list li {
  list-style: none;
  position: relative;
  padding-left: 4px;

  &::before {
    content: '☐';
    margin-right: 6px;
    color: #999;
  }
}

.process-body {
  padding-left: 4px;
}

.empty-hint {
  text-align: center;
  padding: 48px;
  color: #999;
  background: #fff;
  border-radius: 8px;
}
</style>
