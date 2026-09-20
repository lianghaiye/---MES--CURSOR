<template>
  <div class="replenish-center-page">
    <StockReplenishPanel />
  </div>
</template>

<script>
export default { name: 'ReplenishCenterView' }
</script>

<script setup>
import StockReplenishPanel from './components/StockReplenishPanel.vue'
</script>

<style lang="less" scoped>
.replenish-center-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}
</style>
