<template>
  <div class="bom-version-timeline">
    <div v-for="(item, index) in items" :key="item.version" class="timeline-item">
      <div class="timeline-axis">
        <span class="timeline-dot" :class="{ current: item.tag === '当前版本' }" />
        <span v-if="index < items.length - 1" class="timeline-line" />
      </div>
      <div class="timeline-content">
        <div class="version-head">
          <div class="version-title">
            <span class="version-no">{{ item.version }}</span>
            <span v-if="item.tag" class="version-tag">{{ item.tag }}</span>
          </div>
          <span class="version-date">{{ item.date }}</span>
        </div>
        <div class="version-card">
          <template v-if="item.isInitial">
            <div class="initial-note">{{ item.initialNote }}</div>
          </template>
          <template v-else>
            <div class="version-row">
              <span class="row-label">变更来源：</span>
              <a v-if="item.ecnNo" class="link-code">{{ item.ecnNo }}</a>
              <span v-else>—</span>
            </div>
            <div class="version-row">
              <span class="row-label">变更内容：</span>
              <span>{{ item.changeSummary || '—' }}</span>
            </div>
            <div class="version-row">
              <span class="row-label">执行人：</span>
              <span>{{ item.executor || '—' }}</span>
            </div>
          </template>
        </div>
        <div class="version-actions">
          <a-button type="link" size="small" class="action-link" @click="emitViewBom(item)">
            查看BOM
          </a-button>
          <a-button
            v-if="item.compareVersion"
            type="link"
            size="small"
            class="action-link"
            @click="emitCompare(item)"
          >
            对比{{ item.compareVersion }}
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'EcnBomVersionTimeline' }
</script>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['view-bom', 'compare'])

function emitViewBom(item) {
  emit('view-bom', item)
}

function emitCompare(item) {
  emit('compare', item)
}
</script>

<style lang="less" scoped>
.bom-version-timeline {
  padding: 4px 0;
}

.timeline-item {
  display: flex;
  gap: 12px;
}

.timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #d9d9d9;
  background: #fff;
  margin-top: 6px;

  &.current {
    border-color: #1677ff;
    background: #1677ff;
  }
}

.timeline-line {
  flex: 1;
  width: 2px;
  min-height: 24px;
  background: #f0f0f0;
  margin: 4px 0;
}

.timeline-content {
  flex: 1;
  padding-bottom: 20px;
}

.version-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.version-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-no {
  font-size: 14px;
  font-weight: 600;
}

.version-tag {
  font-size: 12px;
  color: #8c8c8c;
}

.version-date {
  font-size: 12px;
  color: #8c8c8c;
}

.version-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 13px;
  color: #595959;
  line-height: 1.7;
}

.version-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.row-label {
  color: #262626;
  font-weight: 500;
  flex-shrink: 0;
}

.initial-note {
  color: #595959;
}

.version-actions {
  margin-top: 6px;
}

.action-link {
  padding: 0 8px 0 0;
  height: auto;
}

.link-code {
  color: #1677ff;
}
</style>
