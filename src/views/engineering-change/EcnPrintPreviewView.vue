<template>
  <div class="ecn-print-preview-page" :class="pageClass">
    <div v-if="!payload" class="empty-wrap">
      <a-empty description="打印数据不存在或已过期，请返回详情页重新打开" />
    </div>
    <template v-else>
      <div class="preview-toolbar no-print">
        <a-space>
          <a-button type="primary" @click="handlePrint">
            <PrinterOutlined />
            打印
          </a-button>
          <a-button @click="handleClose">关闭</a-button>
        </a-space>
      </div>

      <div class="preview-canvas">
        <article ref="sheetRef" class="print-sheet">
          <header class="sheet-header">
            <h1 class="sheet-title">工程变更通知单</h1>
            <div class="sheet-subtitle">Engineering Change Notice</div>
            <div class="sheet-doc-row">
              <span>单号：{{ payload.docNo }}</span>
              <span class="status-tag">{{ payload.status }}</span>
            </div>
          </header>

          <section class="print-section">
            <table class="info-grid">
              <tbody>
                <tr>
                  <th>变更类型</th>
                  <td>{{ payload.basicInfo.type }}</td>
                  <th>变更原因</th>
                  <td>{{ payload.basicInfo.changeReason }}</td>
                  <th>紧急程度</th>
                  <td>{{ payload.basicInfo.urgency }}</td>
                </tr>
                <tr>
                  <th>申请人</th>
                  <td>{{ payload.basicInfo.applicant }}</td>
                  <th>申请部门</th>
                  <td>{{ payload.basicInfo.department }}</td>
                  <th>申请日期</th>
                  <td>{{ payload.basicInfo.createdAt }}</td>
                </tr>
                <tr>
                  <th>执行日期</th>
                  <td>{{ payload.basicInfo.executedAt || '—' }}</td>
                  <th>执行人</th>
                  <td>{{ payload.basicInfo.executor || '—' }}</td>
                  <th>关联单据</th>
                  <td>{{ payload.basicInfo.relatedDoc }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="print-section">
            <div class="section-heading">变更说明</div>
            <div class="desc-box">{{ payload.description || '—' }}</div>
          </section>

          <section class="print-section">
            <div class="section-heading">变更内容明细</div>
            <div v-if="payload.changeRows.length" class="change-item-list">
              <div v-for="row in payload.changeRows" :key="row.index" class="change-item-card">
                <table class="change-meta-table">
                  <tbody>
                    <tr>
                      <th>序号</th>
                      <td>{{ row.index }}</td>
                      <th>变更操作</th>
                      <td colspan="3">{{ row.changeType }}</td>
                    </tr>
                  </tbody>
                </table>
                <table class="change-field-table">
                  <thead>
                    <tr>
                      <th class="col-field">字段</th>
                      <th class="col-before">变更前</th>
                      <th class="col-after">变更后</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="field in row.fieldRows" :key="field.label">
                      <th class="field-label">{{ field.label }}</th>
                      <td :class="{ 'value-changed-before': field.changed }">{{ field.before }}</td>
                      <td :class="{ 'value-changed-after': field.changed }">{{ field.after }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="row.changeNote && row.changeNote !== '—'" class="change-note-row">
                  <span class="note-label">变更说明</span>
                  <span class="note-text">{{ row.changeNote }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-change">暂无变更内容明细</div>
          </section>

          <section class="print-section">
            <div class="section-heading">影响分析</div>
            <table class="impact-grid">
              <tbody>
                <tr>
                  <td class="impact-card">
                    <div class="impact-label">BOM 版本</div>
                    <div class="impact-value impact-value-sm">
                      {{ payload.impact.bomVersionAction }}
                    </div>
                    <div class="impact-sub">
                      {{ payload.affectedProduct.versionBefore }} →
                      {{ payload.affectedProduct.versionAfter }}
                    </div>
                  </td>
                  <td class="impact-card">
                    <div class="impact-label">执行配置</div>
                    <div class="impact-value impact-value-sm">{{ payload.impact.execConfig }}</div>
                    <div class="impact-sub">{{ payload.impact.execConfigNote }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section v-if="payload.approvalRows.length" class="print-section">
            <div class="section-heading">审批记录</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 48px">序号</th>
                  <th style="width: 100px">审批层级</th>
                  <th style="width: 80px">审批人</th>
                  <th style="width: 80px">审批结果</th>
                  <th style="width: 130px">审批时间</th>
                  <th>审批意见</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in payload.approvalRows" :key="row.index">
                  <td class="center">{{ row.index }}</td>
                  <td>{{ row.role }}</td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.result }}</td>
                  <td>{{ row.time }}</td>
                  <td>{{ row.opinion }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer class="sign-footer">
            <table class="sign-row">
              <tbody>
                <tr>
                  <td class="sign-col">
                    <div class="sign-label">申请人签字</div>
                    <div class="sign-line" />
                  </td>
                  <td class="sign-col">
                    <div class="sign-label">审批人签字</div>
                    <div class="sign-line" />
                  </td>
                  <td class="sign-col">
                    <div class="sign-label">执行人签字</div>
                    <div class="sign-line" />
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="page-meta">
              <span>打印时间：{{ payload.printedAt }}</span>
              <span>第 1 页 / 共 1 页</span>
            </div>
          </footer>
        </article>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'EcnPrintPreviewView' }
</script>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { loadEcnPrintPayload } from '@/utils/ecnPrintPreview'
import { printElement } from '@/utils/browserPrint'

const route = useRoute()
const sheetRef = ref(null)
const payload = ref(null)

const pageClass = computed(() => {
  const paper = payload.value?.paper || 'A4'
  const orientation = payload.value?.orientation || 'portrait'
  return [`paper-${paper}`, `orient-${orientation}`]
})

function handlePrint() {
  if (!sheetRef.value) return
  printElement(sheetRef.value, {
    title: payload.value?.docNo ? `ECN ${payload.value.docNo}` : '工程变更通知单',
    bodyClass: 'ecn-print-iframe-body',
  })
}

function handleClose() {
  window.close()
}

onMounted(() => {
  payload.value = loadEcnPrintPayload(route.query.key)

  if (route.query.autoPrint === '1' && payload.value) {
    setTimeout(() => handlePrint(), 300)
  }
})
</script>

<style src="@/styles/ecn-print-sheet.css"></style>

<style>
html,
body,
#app {
  min-height: 100%;
  margin: 0;
}
</style>

<style lang="less" scoped>
.ecn-print-preview-page {
  min-height: 100vh;
  background: #ececec;
}

.empty-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.preview-canvas {
  padding: 24px 16px;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.print-sheet {
  flex-shrink: 0;
}
</style>
