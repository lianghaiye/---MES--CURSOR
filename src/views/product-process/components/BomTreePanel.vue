<template>
  <div class="bom-tree-panel">
    <a-button
      v-if="!readonly"
      type="primary"
      block
      class="tpl-btn"
      @click="emit('import-template')"
    >
      从模板创建
    </a-button>
    <div class="tree-wrap">
      <a-tree
        v-if="treeData.length"
        :tree-data="treeData"
        :expanded-keys="expandedKeys"
        block-node
        :selected-keys="selectedKeys"
        @expand="onExpand"
        @select="onSelect"
      >
        <template #title="node">
          <div
            class="tree-node-row"
            @mouseenter="hoverKey = node.key"
            @mouseleave="hoverKey = null"
          >
            <span class="node-label">
              {{ node.title }}
              <span v-if="node.quantity != null" class="qty">({{ node.quantity }})</span>
              <a-tag v-if="node.isKeyPart" color="error" class="key-tag">关键件</a-tag>
            </span>
            <span
              v-if="!readonly && hoverKey === node.key && !node.isRoot"
              class="node-actions"
              @click.stop
            >
              <a-button type="link" size="small" @click="emit('add-child', node.key)">
                添加子项
              </a-button>
              <a-button type="link" size="small" danger @click="emit('delete-node', node.key)">
                删除
              </a-button>
            </span>
            <span
              v-else-if="!readonly && hoverKey === node.key && node.isRoot"
              class="node-actions"
              @click.stop
            >
              <a-button type="link" size="small" @click="emit('add-child', node.key)">
                添加子项
              </a-button>
            </span>
          </div>
        </template>
      </a-tree>
      <a-empty v-else :image="false" description="请选择产品/物料作为根节点" />
    </div>
    <div v-if="versionInfo?.version || templateRef?.version" class="tree-footer">
      <div>BOM版本：{{ versionInfo?.version || templateRef?.version }}</div>
      <div>生效日期：{{ versionInfo?.effectiveAt || templateRef?.effectiveAt || '—' }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { buildAntTreeData } from '@/utils/bomTree'

const props = defineProps({
  flatNodes: { type: Array, default: () => [] },
  selectedNodeId: { type: String, default: '' },
  templateRef: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  versionInfo: { type: Object, default: null },
})

const emit = defineEmits(['import-template', 'add-child', 'delete-node', 'select-node', 'update:expandedKeys'])

const hoverKey = ref(null)
const expandedKeys = ref([])

const treeData = computed(() => {
  const data = buildAntTreeData(props.flatNodes)
  const enrich = (nodes) =>
    nodes.map((n) => {
      const flat = props.flatNodes.find((f) => f.id === n.key)
      return {
        ...n,
        title: flat?.title || n.title,
        quantity: flat?.quantity ?? 1,
        isRoot: flat?.isRoot,
        isKeyPart: flat?.isKeyPart,
        children: n.children ? enrich(n.children) : undefined,
      }
    })
  return enrich(data)
})

const selectedKeys = computed(() =>
  props.selectedNodeId ? [props.selectedNodeId] : [],
)

watch(
  () => props.flatNodes.map((n) => n.id).join(','),
  () => {
    nextTick(() => {
      expandedKeys.value = props.flatNodes.map((n) => n.id)
    })
  },
  { immediate: true },
)

function onExpand(keys) {
  expandedKeys.value = keys
}

function onSelect(keys) {
  const id = keys[0] || ''
  emit('select-node', id)
}
</script>

<style lang="less" scoped>
.bom-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;

  .tpl-btn {
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  .tree-wrap {
    flex: 1;
    overflow: auto;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 8px;
    background: #fafafa;
  }

  .tree-node-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 28px;
    padding-right: 4px;

    .node-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }

    .qty {
      color: rgba(0, 0, 0, 0.45);
    }

    .key-tag {
      margin-left: 4px;
      font-size: 11px;
      line-height: 18px;
    }

    .node-actions {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }

  .tree-footer {
    margin-top: 8px;
    padding: 8px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
    background: #f5f5f5;
    border-radius: 4px;
    line-height: 1.6;
  }
}
</style>
