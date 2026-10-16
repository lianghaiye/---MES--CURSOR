<template>
  <div class="report-center list-page">
    <section class="hero-card">
      <div class="hero-text">
        <h2 class="hero-title">报表中心</h2>
        <p class="hero-desc">
          P0
          经营报表（表格+导出，非图表）。销售按<strong>审核通过日</strong>；库存按<strong>确认入库日</strong>；金额纳入统计。
        </p>
      </div>
    </section>

    <section v-for="group in groups" :key="group.key" class="group-block">
      <div class="group-head">
        <span class="group-bar" />
        <h3 class="group-title">{{ group.label }}</h3>
      </div>
      <div class="card-grid">
        <button
          v-for="item in group.items"
          :key="item.key"
          type="button"
          class="report-card"
          @click="openReport(item)"
        >
          <div class="card-title">{{ item.title }}</div>
          <div class="card-q">{{ item.question }}</div>
          <div class="card-desc">{{ item.desc }}</div>
          <div class="card-meta">时间口径：{{ item.timeFieldLabel }}</div>
          <div class="card-foot">进入报表 ›</div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { groupReportCatalog } from '@/config/reportCatalog'

defineOptions({ name: 'ReportCenterView' })

const router = useRouter()
const { openTab } = useTabs()
const groups = computed(() => groupReportCatalog())

function openReport(item) {
  openTab(item.path, item.title)
  router.push(item.path)
}
</script>

<style lang="less" scoped>
.report-center {
  padding-bottom: 24px;
}

.hero-card {
  margin-bottom: 16px;
  padding: 20px 20px 18px;
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 55%, #003eb3 100%);
  border-radius: 10px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(22, 119, 255, 0.2);
}

.hero-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.hero-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
}

.group-block {
  margin-bottom: 20px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.group-bar {
  width: 4px;
  height: 16px;
  border-radius: 4px;
  background: #1677ff;
}

.group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.report-card {
  text-align: left;
  padding: 16px 16px 12px;
  border: 1px solid #e5e6eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  &:hover {
    border-color: #91caff;
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.12);
  }
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.card-q {
  margin-top: 6px;
  font-size: 13px;
  color: #1677ff;
}

.card-desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.45);
  min-height: 36px;
}

.card-meta {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}

.card-foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
}
</style>
