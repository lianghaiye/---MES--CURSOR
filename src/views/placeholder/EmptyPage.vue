<template>
  <div class="empty-page">
    <a-empty :description="description">
      <template #image>
        <InboxOutlined style="font-size: 64px; color: #d9d9d9" />
      </template>
      <p class="hint">该模块页面为占位，后续可在此目录扩展业务功能。</p>
    </a-empty>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { InboxOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const description = computed(() => `${route.meta?.title || '页面'} — 开发中`)
</script>

<style lang="less" scoped>
.empty-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  margin-top: 8px;
}
</style>
