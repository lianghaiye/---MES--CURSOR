<template>
  <div class="sales-approval-info">
    <p class="intro">{{ intro }}</p>

    <DetailSectionCard v-if="showOrder" :title="orderTitle">
      <div v-if="orderNodes.length" class="section-meta">
        最新结果
        <a-tag :color="approvalResultColor(orderLatest)">{{ orderLatest }}</a-tag>
        <span class="meta-count">共 {{ orderNodes.length }} 条节点</span>
      </div>
      <a-timeline v-if="orderNodes.length" class="appr-timeline">
        <a-timeline-item
          v-for="(item, idx) in orderNodes"
          :key="`so-${idx}`"
          :color="approvalTimelineColor(item.result)"
        >
          <div class="appr-node" :class="{ 'is-pending': isPending(item) }">
            <div class="appr-node-top">
              <a-tag :color="approvalResultColor(item.result)" size="small">{{
                item.result
              }}</a-tag>
              <span class="appr-step">{{ item.step || item.role || '节点' }}</span>
              <span class="appr-user">{{ displayName(item) }}</span>
              <span v-if="item.time" class="appr-time">{{ item.time }}</span>
            </div>
            <div v-if="item.opinion" class="appr-opinion">意见：{{ item.opinion }}</div>
          </div>
        </a-timeline-item>
      </a-timeline>
      <a-empty v-else :image="false" :description="orderEmpty" />
    </DetailSectionCard>

    <DetailSectionCard v-if="showChange" :title="changeTitle">
      <div v-if="groups.length" class="change-list">
        <div v-for="group in groups" :key="group.id" class="change-card">
          <div class="change-head">
            <span class="change-no">{{ group.changeNo || '变更单' }}</span>
            <a-tag :color="changeDocStatusColor(group.status)" size="small">
              {{ group.status }}
            </a-tag>
            <span v-if="group.reasonType && group.reasonType !== '—'" class="change-reason">
              {{ group.reasonType }}
            </span>
          </div>
          <div v-if="group.customerHint" class="change-hint">{{ group.customerHint }}</div>
          <a-timeline class="appr-timeline">
            <a-timeline-item
              v-for="(item, idx) in group.items"
              :key="`${group.id}-${idx}`"
              :color="approvalTimelineColor(item.result)"
            >
              <div class="appr-node" :class="{ 'is-pending': isPending(item) }">
                <div class="appr-node-top">
                  <a-tag :color="approvalResultColor(item.result)" size="small">
                    {{ item.result }}
                  </a-tag>
                  <span class="appr-step">{{ item.step || item.role || '节点' }}</span>
                  <span class="appr-user">{{ displayName(item) }}</span>
                  <span v-if="item.time" class="appr-time">{{ item.time }}</span>
                </div>
                <div v-if="item.opinion" class="appr-opinion">意见：{{ item.opinion }}</div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </div>
      </div>
      <a-empty v-else :image="false" :description="changeEmpty" />
    </DetailSectionCard>
  </div>
</template>

<script>
export default { name: 'SalesApprovalInfoPanel' }
</script>

<script setup>
import { computed } from 'vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import {
  approvalResultColor,
  approvalTimelineColor,
  buildSalesOrderApprovalTimeline,
  changeDocStatusColor,
  latestOrderApprovalResult,
} from '@/utils/salesApprovalDisplay'

const props = defineProps({
  order: { type: Object, default: null },
  changeGroups: { type: Array, default: () => [] },
  intro: {
    type: String,
    default:
      '按时间查看本单「提交 → 审核」过程。订单审批与订单变更审批分开列出，通过、驳回都能直接对照意见。',
  },
  orderTitle: { type: String, default: '销售订单审批' },
  changeTitle: { type: String, default: '订单变更审批' },
  orderEmpty: {
    type: String,
    default: '还没有订单审批记录（提交审核后会出现提交和审核节点）',
  },
  changeEmpty: { type: String, default: '还没有订单变更审批记录' },
  showOrder: { type: Boolean, default: true },
  showChange: { type: Boolean, default: true },
})

const orderNodes = computed(() => buildSalesOrderApprovalTimeline(props.order))
const orderLatest = computed(() => latestOrderApprovalResult(props.order))
const groups = computed(() => props.changeGroups || [])

function isPending(item) {
  return item?.result === '待审核' || item?.pending
}

function displayName(item) {
  if (isPending(item)) return '等待审核人处理'
  const name = item?.displayName || item?.name
  return name && name !== '—' ? name : '—'
}
</script>

<style lang="less" scoped>
.intro {
  margin: 0 0 12px;
  color: rgba(0, 0, 0, 0.55);
  font-size: 13px;
  line-height: 1.6;
}

.section-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.meta-count {
  color: rgba(0, 0, 0, 0.45);
}

.appr-timeline {
  padding-top: 4px;
  margin-left: 6px;
}

.change-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.change-card {
  padding: 12px 14px 4px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
}

.change-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.change-no {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.change-reason {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.change-hint {
  margin: -2px 0 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.appr-node-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.appr-step {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.appr-user {
  color: rgba(0, 0, 0, 0.65);
}

.appr-time {
  margin-left: auto;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.appr-opinion {
  margin-top: 6px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.75);
  font-size: 13px;
  line-height: 1.5;
}

.appr-node.is-pending .appr-user {
  color: rgba(0, 0, 0, 0.35);
}
</style>
