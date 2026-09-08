<template>
  <div class="standard-kit-block">
    <div class="block-title">标准随货包（参考）</div>
    <div v-if="kits.length" class="kit-list">
      <div v-for="kit in kits" :key="kit.key" class="kit-card">
        <div class="kit-head">
          <span>
            {{ kit.productName }}
            <span v-if="kit.productCode" class="kit-code">{{ kit.productCode }}</span>
          </span>
          <span v-if="kit.bomName" class="kit-bom">
            {{ kit.bomName }}（{{ kit.bomNo }}）· {{ kit.materialCount }} 项
          </span>
          <span v-else class="kit-bom muted">未命中已启用随货附件</span>
        </div>
        <a-table
          v-if="kit.lines.length"
          :columns="kitLineColumns"
          :data-source="kit.lines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        />
      </div>
    </div>
    <a-empty v-else description="本单没有可匹配的产品" :image="false" class="inner-empty" />
  </div>
</template>

<script>
export default { name: 'ShipAttachmentStandardKitBlock' }
</script>

<script setup>
defineProps({
  kits: { type: Array, default: () => [] },
})

const kitLineColumns = [
  { title: '物料编码', dataIndex: 'materialCode', width: 130 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '单位用量', dataIndex: 'unitQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 64 },
]
</script>

<style lang="less" scoped>
.block-title {
  font-size: 13px;
  font-weight: 600;
  margin: 8px 0 6px;
}

.inner-empty {
  margin: 8px 0 12px;
  :deep(.ant-empty-description) {
    font-size: 12px;
  }
}

.kit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kit-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fafafa;
}

.kit-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}

.kit-code {
  margin-left: 6px;
  color: rgba(0, 0, 0, 0.45);
}

.kit-bom {
  color: rgba(0, 0, 0, 0.65);
  flex-shrink: 0;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
}
</style>
