<template>
  <div class="replenish-center-page">
    <div class="page-card">
      <div class="page-title">库存预警</div>
      <StockReplenishPanel />
    </div>
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
  background: #f5f6f8;
  min-height: calc(100vh - 56px - 40px - 24px);
  box-sizing: border-box;
}

.page-card {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
