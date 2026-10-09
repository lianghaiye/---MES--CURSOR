<template>
  <div class="master-info-row-actions" @click.stop>
    <a class="action-link" @click="emit('edit')">编辑</a>
    <a class="action-link" @click="emit('clone')">克隆</a>
    <a class="action-link" @click="emit('bom')">BOM维护</a>
    <a-dropdown :trigger="['click']">
      <a class="action-link" @click.prevent>操作</a>
      <template #overlay>
        <a-menu class="master-info-action-menu" @click="onMenuClick">
          <a-menu-item v-if="showArchive" key="archive">
            <span class="menu-item-inner">
              <InboxOutlined />
              归档
            </span>
          </a-menu-item>
          <a-menu-item v-if="showUnarchive" key="unarchive">
            <span class="menu-item-inner">
              <RollbackOutlined />
              取消归档
            </span>
          </a-menu-item>
          <a-menu-item key="delete" danger>
            <span class="menu-item-inner">
              <DeleteOutlined />
              删除
            </span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup>
import { DeleteOutlined, InboxOutlined, RollbackOutlined } from '@ant-design/icons-vue'

defineProps({
  showArchive: { type: Boolean, default: false },
  showUnarchive: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'bom', 'delete', 'clone', 'archive', 'unarchive'])

function onMenuClick({ key }) {
  if (key === 'delete') emit('delete')
  else if (key === 'archive') emit('archive')
  else if (key === 'unarchive') emit('unarchive')
}
</script>

<style lang="less" scoped>
.master-info-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.action-link {
  color: #1677ff;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #4096ff;
  }
}

.menu-item-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
