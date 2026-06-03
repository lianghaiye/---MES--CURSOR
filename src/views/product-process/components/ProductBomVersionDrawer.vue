<template>
  <a-drawer
    :open="open"
    title="BOM 版本历史"
    width="960"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <template v-if="groupVersions.length">
      <div class="drawer-head">
        <span class="head-name">{{ headRecord?.bomName }}</span>
        <span class="head-item">物品：{{ headRecord?.itemName }}</span>
      </div>
      <a-table
        :columns="columns"
        :data-source="groupVersions"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isDefault'">
            <a-tag :color="record.isDefault ? 'success' : 'error'">
              {{ record.isDefault ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'production'">
            <a-tag :color="isBomProductionReady(record) ? 'success' : 'default'">
              {{ isBomProductionReady(record) ? '可用' : '不可用' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </template>
    <a-empty v-else description="暂无版本记录" />
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { productBomState } from '@/store/productBomStore'
import { getVersionsInGroup } from '@/mock/productBom'
import { bomStatusColor, isBomProductionReady } from '@/mock/productBomOptions'

const props = defineProps({
  open: Boolean,
  record: { type: Object, default: null },
})
const emit = defineEmits(['update:open'])

const headRecord = computed(() => props.record)

const groupVersions = computed(() => {
  if (!props.record?.versionGroupId) return []
  return getVersionsInGroup(productBomState.boms, props.record.versionGroupId)
})

const columns = [
  { title: 'BOM版本', dataIndex: 'version', width: 100 },
  { title: '状态', key: 'status', width: 88 },
  { title: '生产可用', key: 'production', width: 88, align: 'center' },
  { title: '是否默认', key: 'isDefault', width: 88, align: 'center' },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '失效日期', dataIndex: 'expiredAt', width: 150 },
  { title: '最近更新', dataIndex: 'updatedAt', width: 150 },
  { title: '操作人', dataIndex: 'operator', width: 80 },
  { title: '创建日期', dataIndex: 'createdAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 80 },
]
</script>

<style lang="less" scoped>
.drawer-head {
  margin-bottom: 12px;
  font-size: 13px;

  .head-name {
    font-weight: 600;
    margin-right: 16px;
  }

  .head-item {
    color: rgba(0, 0, 0, 0.65);
  }
}
</style>
