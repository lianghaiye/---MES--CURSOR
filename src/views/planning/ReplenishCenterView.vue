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
  padding: 0;
}
</style>
