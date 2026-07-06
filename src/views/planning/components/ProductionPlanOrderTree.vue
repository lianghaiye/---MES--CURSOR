<template>
  <div class="plan-order-tree">
    <a-empty v-if="!treeData.length" description="暂无工作项" class="tree-empty" />

    <div v-else class="tree-wrap">
      <a-tree
        :tree-data="treeData"
        :expanded-keys="expandedKeys"
        block-node
        :selectable="false"
        @expand="onExpand"
      >
        <template #title="node">
          <div
            class="tree-node-row"
            :class="{
              'is-work-item': node.nodeType === 'workItem',
              'is-material': node.nodeType === 'material',
              'is-document': node.nodeType === 'document',
              'is-top-level': node.isTopLevel,
            }"
          >
            <template v-if="node.nodeType === 'workItem'">
              <span class="node-name">{{ node.productName || '—' }}</span>
              <span v-if="node.productCode" class="node-code">{{ node.productCode }}</span>
              <a-tag
                v-if="node.status"
                :color="workItemStatusColor(node.status)"
                class="status-tag"
              >
                {{ node.status }}
              </a-tag>
            </template>

            <template v-else-if="node.nodeType === 'material'">
              <span class="node-name">{{ node.materialName || node.title || '—' }}</span>
              <span v-if="node.materialCode" class="node-code">{{ node.materialCode }}</span>
              <a-tag
                v-if="node.supplyType"
                :color="supplyTypeColor(node.supplyType)"
                class="supply-tag"
              >
                {{ node.supplyType }}
              </a-tag>
            </template>

            <template v-else-if="node.nodeType === 'document'">
              <span class="doc-type">{{ node.docType }}</span>
              <span class="doc-sep">{{ docSeparator }}</span>
              <a class="doc-no" @click.prevent="openDocument(node)">{{ node.docNo }}</a>
              <span class="doc-sep">{{ docSeparator }}</span>
              <span class="doc-product">{{ node.productName || '—' }}</span>
              <span class="doc-sep">{{ docSeparator }}</span>
              <a-tag :color="documentStatusColor(node.docType, node.status)" class="status-tag">
                {{ node.status || '—' }}
              </a-tag>
            </template>
          </div>
        </template>
      </a-tree>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import {
  PLAN_ORDER_DOC_SEPARATOR,
  collectProductionPlanOrderTreeKeys,
} from '@/utils/productionPlanOrderTree'
import { supplyTypeColor } from '@/utils/ebomTreeView'

const props = defineProps({
  treeData: { type: Array, default: () => [] },
})

const router = useRouter()
const { openTab } = useTabs()
const docSeparator = PLAN_ORDER_DOC_SEPARATOR
const expandedKeys = ref([])

watch(
  () => props.treeData,
  (tree) => {
    expandedKeys.value = collectProductionPlanOrderTreeKeys(tree)
  },
  { immediate: true, deep: true },
)

function onExpand(keys) {
  expandedKeys.value = keys
}

function workItemStatusColor(status) {
  if (status === '进行中') return 'processing'
  if (status === '设计中') return 'orange'
  if (status === '已完成') return 'success'
  return 'default'
}

function documentStatusColor(docType, status) {
  if (docType === '采购申请') {
    if (status === '处理中') return 'processing'
    if (status === '已完成') return 'success'
    return 'default'
  }
  if (status === '执行中' || status === '进行中') return 'processing'
  if (status === '完成' || status === '已完成') return 'success'
  if (status === '待下发') return 'default'
  return 'blue'
}

function openDocument(node) {
  if (!node?.docType) return

  if (node.docType === '采购申请') {
    const path = `/procurement/purchase-req/${node.docId}`
    openTab(path, '采购申请详情')
    router.push(path)
    return
  }

  if (node.docType === '总装工单') {
    const path = '/production/assembly-work-orders'
    openTab(path, '总装工单')
    router.push(path)
    return
  }

  const path = '/production/work-orders'
  openTab(path, node.docType)
  router.push(path)
}
</script>

<style lang="less" scoped>
.plan-order-tree {
  min-height: 200px;
}

.tree-empty {
  margin: 48px 0;
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

  &.is-work-item,
  &.is-top-level {
    .node-name {
      font-weight: 600;
      color: rgba(0, 0, 0, 0.88);
    }
  }

  &.is-document {
    font-size: 12px;
  }

  .node-code {
    color: #1677ff;
    font-family: monospace;
    flex-shrink: 0;
  }

  .node-name,
  .doc-product {
    color: rgba(0, 0, 0, 0.88);
  }

  .doc-type {
    color: rgba(0, 0, 0, 0.65);
  }

  .doc-sep {
    color: rgba(0, 0, 0, 0.25);
  }

  .doc-no {
    color: #1677ff;
    font-family: monospace;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .status-tag,
  .supply-tag {
    margin: 0;
    font-size: 10px;
    line-height: 16px;
    padding-inline: 4px;
  }
}
</style>
