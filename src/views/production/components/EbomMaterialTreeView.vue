<template>
  <div class="ebom-tree-view">
    <div v-if="subtitle" class="ebom-subtitle">{{ subtitle }}</div>
    <div v-if="bomMeta" class="ebom-head">
      <span class="ebom-title">{{ bomMeta.bomName }}</span>
      <a-tag v-if="bomMeta.bomVersion" color="blue">{{ bomMeta.bomVersion }}</a-tag>
      <span v-if="bomMeta.bomNo" class="ebom-no">{{ bomMeta.bomNo }}</span>
      <span v-if="bomMeta.parentProductName" class="ebom-parent">
        所属成品：{{ bomMeta.parentProductName }}
      </span>
    </div>

    <a-empty v-if="!displayTree.length" :description="emptyText" class="ebom-empty" />

    <div v-else class="tree-wrap">
      <a-tree
        :tree-data="displayTree"
        :expanded-keys="innerExpandedKeys"
        block-node
        :selectable="false"
        @expand="onExpand"
      >
        <template #title="node">
          <div
            class="tree-node-row"
            :class="{ 'is-root': node.isRoot, 'is-current': node.isCurrent }"
          >
            <span class="node-code">{{ node.code || '—' }}</span>
            <span class="node-name">{{ node.name }}</span>
            <span v-if="node.spec" class="node-spec">{{ node.spec }}</span>
            <span class="node-qty">
              {{ node.unitUsage }}{{ node.unit || '件' }}
              <template v-if="node.demandQty != null && !node.isRoot">
                / 需求 {{ node.demandQty }}
              </template>
            </span>
            <a-tag
              v-if="node.supplyType"
              :color="supplyTypeColor(node.supplyType)"
              class="supply-tag"
            >
              {{ node.supplyType }}
            </a-tag>
            <a-tag v-if="node.type && !node.isRoot" class="type-tag">{{ node.type }}</a-tag>
            <span v-if="node.childBom" class="child-bom">子件BOM：{{ node.childBom }}</span>
          </div>
        </template>
      </a-tree>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { enrichTreeTitles, supplyTypeColor } from '@/utils/ebomTreeView'

const props = defineProps({
  treeData: { type: Array, default: () => [] },
  expandedKeys: { type: Array, default: () => [] },
  bomMeta: { type: Object, default: null },
  emptyText: { type: String, default: '未找到关联的 EBOM 物料树' },
  subtitle: { type: String, default: '' },
})

const innerExpandedKeys = ref([])

const displayTree = computed(() => props.treeData.map(enrichTreeTitles))

watch(
  () => props.expandedKeys,
  (keys) => {
    innerExpandedKeys.value = keys
  },
  { immediate: true },
)

function onExpand(keys) {
  innerExpandedKeys.value = keys
}
</script>

<style lang="less" scoped>
.ebom-tree-view {
  min-height: 200px;
}

.ebom-subtitle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
}

.ebom-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;

  .ebom-title {
    font-weight: 600;
    font-size: 13px;
  }

  .ebom-no,
  .ebom-parent {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}

.ebom-empty {
  margin: 32px 0;
}

.tree-wrap {
  max-height: calc(100vh - 320px);
  overflow: auto;
  padding: 4px 0;

  :deep(.ant-tree-treenode) {
    padding: 2px 0;
  }

  :deep(.ant-tree-node-content-wrapper) {
    flex: 1;
    min-width: 0;
  }
}

.tree-node-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  padding: 2px 0;

  &.is-root,
  &.is-current {
    .node-name {
      font-weight: 600;
      color: rgba(0, 0, 0, 0.88);
    }
  }

  &.is-current {
    background: #fffbe6;
    border-radius: 4px;
    padding: 2px 4px;
  }

  .node-code {
    color: #1677ff;
    font-family: monospace;
    flex-shrink: 0;
  }

  .node-name {
    color: rgba(0, 0, 0, 0.88);
  }

  .node-spec {
    color: rgba(0, 0, 0, 0.45);
    font-size: 11px;
  }

  .node-qty {
    color: rgba(0, 0, 0, 0.65);
    font-size: 11px;
  }

  .child-bom {
    font-size: 11px;
    color: #d48806;
  }

  .supply-tag,
  .type-tag {
    margin: 0;
    font-size: 10px;
    line-height: 16px;
    padding-inline: 4px;
  }
}
</style>
