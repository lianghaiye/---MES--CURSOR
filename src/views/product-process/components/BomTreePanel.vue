<template>
  <div class="bom-tree-panel">
    <div class="search-row">
      <a-input
        v-model:value="searchKeyword"
        allow-clear
        size="small"
        placeholder="搜索树节点"
        class="tree-search"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
      <a-tooltip title="字段配置（最多显示4个字段）">
        <a-button type="text" size="small" class="field-config-btn" @click="fieldDrawerOpen = true">
          <SettingOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <div class="action-row">
      <div class="action-row-left">
        <a-button
          v-if="!readonly && !hideSwitchProduct"
          type="text"
          size="small"
          class="action-text-btn"
          :disabled="readonly"
          @click="emit('switch-product')"
        >
          <SwapOutlined />
          切换产品
        </a-button>
        <a-button
          v-if="!readonly"
          type="text"
          size="small"
          class="action-text-btn"
          @click="emit('import-template')"
        >
          <ImportOutlined />
          从模板导入
        </a-button>
      </div>
      <div class="action-row-right">
        <a-tooltip title="展开">
          <a-button type="text" size="small" class="action-icon-btn" @click="expandAll">
            <ExpandOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="收起">
          <a-button type="text" size="small" class="action-icon-btn" @click="collapseAll">
            <CompressOutlined />
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <div class="tree-wrap">
      <a-tree
        v-if="displayTreeData.length"
        :tree-data="displayTreeData"
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
            <span class="node-label" :title="node.displayTitle">{{ node.displayTitle }}</span>
            <span
              v-if="!readonly && hoverKey === node.key && !node.isRoot"
              class="node-actions"
              @click.stop
            >
              <a-button type="link" size="small" @click="emit('add-child', node.key)">
                添加
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
                添加
              </a-button>
            </span>
          </div>
        </template>
      </a-tree>
      <a-empty v-else description="请选择产品/物料作为根节点" />
    </div>

    <div v-if="versionInfo?.version || templateRef?.version" class="tree-footer">
      <div>BOM版本：{{ versionInfo?.version || templateRef?.version }}</div>
      <div>生效日期：{{ versionInfo?.effectiveAt || templateRef?.effectiveAt || '—' }}</div>
    </div>

    <BomTreeFieldSettingDrawer
      v-model:open="fieldDrawerOpen"
      v-model:settings="treeFieldSettings"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
  ExpandOutlined,
  CompressOutlined,
  ImportOutlined,
} from '@ant-design/icons-vue'
import { buildAntTreeData } from '@/utils/bomTree'
import { formatBomTreeNodeTitle, filterTreeNodesByKeyword } from '@/utils/bomTreeDisplay'
import { defaultBomTreeFieldSettings } from '@/mock/bomTreeFieldSettings'
import BomTreeFieldSettingDrawer from './BomTreeFieldSettingDrawer.vue'

const props = defineProps({
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  selectedNodeId: { type: String, default: '' },
  templateRef: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  versionInfo: { type: Object, default: null },
  rootMeta: {
    type: Object,
    default: () => ({ code: '', name: '', specModel: '', supplyForm: '', subItemCount: 0 }),
  },
  hideSwitchProduct: { type: Boolean, default: false },
})

const emit = defineEmits([
  'import-template',
  'add-child',
  'delete-node',
  'select-node',
  'switch-product',
])

const hoverKey = ref(null)
const expandedKeys = ref([])
const searchKeyword = ref('')
const fieldDrawerOpen = ref(false)
const treeFieldSettings = ref(JSON.parse(JSON.stringify(defaultBomTreeFieldSettings)))

const filteredFlatNodes = computed(() =>
  filterTreeNodesByKeyword(props.flatNodes, searchKeyword.value, props.rootMeta),
)

const treeData = computed(() => {
  const data = buildAntTreeData(props.flatNodes, props.lineItems)
  const enrich = (nodes) =>
    nodes.map((n) => {
      const flat = filteredFlatNodes.value.find((f) => f.id === n.key)
      const displayTitle = flat
        ? formatBomTreeNodeTitle(
            flat,
            props.flatNodes,
            props.lineItems,
            treeFieldSettings.value,
            props.rootMeta,
          )
        : n.title
      return {
        ...n,
        title: flat?.title || n.title,
        displayTitle,
        quantity: flat?.quantity ?? 1,
        isRoot: flat?.isRoot,
        isKeyPart: flat?.isKeyPart,
        children: n.children ? enrich(n.children) : undefined,
      }
    })
  return enrich(data)
})

const displayTreeData = computed(() => treeData.value)

const selectedKeys = computed(() => (props.selectedNodeId ? [props.selectedNodeId] : []))

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
  emit('select-node', keys[0] || '')
}

function expandAll() {
  expandedKeys.value = filteredFlatNodes.value.map((n) => n.id)
}

function collapseAll() {
  const root = filteredFlatNodes.value.find((n) => n.isRoot)
  expandedKeys.value = root ? [root.id] : []
}
</script>

<style lang="less" scoped>
.bom-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  .search-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    flex-shrink: 0;

    .tree-search {
      flex: 1;
      min-width: 0;
    }

    .field-config-btn {
      flex-shrink: 0;
      color: rgba(0, 0, 0, 0.55);

      &:hover {
        color: #1677ff;
      }
    }
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .action-row-left,
  .action-row-right {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
  }

  .action-text-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    height: 26px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);

    &:hover {
      color: #1677ff;
      background: #f5f5f5;
    }

    &:disabled {
      color: rgba(0, 0, 0, 0.25);
    }
  }

  .action-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    color: rgba(0, 0, 0, 0.65);

    &:hover {
      color: #1677ff;
      background: #f5f5f5;
    }
  }

  .tree-wrap {
    flex: 1;
    min-height: 0;
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
    flex-shrink: 0;
  }
}
</style>
