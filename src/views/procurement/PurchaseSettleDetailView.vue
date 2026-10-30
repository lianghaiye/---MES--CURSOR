<template>
  <div class="purchase-settle-detail-page">
    <a-empty v-if="!record" description="对账单不存在" />
    <template v-else>
      <div class="detail-sticky-bar">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.settleNo }}</span>
            <a-tag :color="statusTagColor">{{ record.status }}</a-tag>
            <a-tag>{{ settleTargetLabel }}</a-tag>
            <a-tag v-if="record.periodKey">账期 {{ record.periodKey }}</a-tag>
          </div>
          <a-space :size="8" wrap>
            <template v-if="isEditable">
              <a-button type="primary" size="small" @click="onConfirm">确认对账</a-button>
              <a-button v-if="record.status === '草稿'" size="small" @click="onMarkReconciling">
                标记对账中
              </a-button>
              <a-button size="small" @click="openFeeModal">追加费用/补差</a-button>
              <a-button size="small" danger @click="onDelete">删除</a-button>
            </template>
            <template v-else-if="record.status === '已确认'">
              <a-button v-if="canUnconfirm" size="small" @click="onUnconfirm"> 反确认 </a-button>
              <a-button
                v-if="canRegisterInvoice"
                type="primary"
                size="small"
                @click="openInvoiceModal"
              >
                收票登记
              </a-button>
              <a-button
                v-if="record.paymentStatus !== '已付款'"
                size="small"
                @click="openPaymentModal"
              >
                登记付款
              </a-button>
            </template>
            <a-button size="small" @click="printModalOpen = true">打印</a-button>
            <a-button size="small" @click="exportModalOpen = true">导出</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="bill" tab="账单信息" />
            <a-tab-pane key="invoice" tab="发票信息" />
            <a-tab-pane key="payment" tab="付款信息" />
            <a-tab-pane key="logs" :tab="`操作日志 (${operationLogs.length})`" />
          </a-tabs>
        </div>
      </div>

      <div class="tab-body">
        <div v-if="activeTab === 'bill'" class="detail-panel detail-steps-panel">
          <a-steps :current="statusStepIndex" size="small" label-placement="vertical">
            <a-step v-for="step in statusSteps" :key="step.key" :title="step.title">
              <template #description>
                <span class="step-desc">{{ step.desc }}</span>
              </template>
            </a-step>
          </a-steps>
        </div>

        <template v-if="activeTab === 'bill'">
          <div class="fund-overview">
            <div class="fund-overview__title">
              <span class="fund-overview__bar" aria-hidden="true" />
              资金概览
            </div>
            <div class="fund-overview__formula">
              <div class="fund-metric is-end">
                <div class="fund-metric__label">期末余额（元）</div>
                <div class="fund-metric__value">{{ formatMoney(fundOverview.endingBalance) }}</div>
              </div>
              <span class="fund-op">=</span>
              <div class="fund-metric">
                <div class="fund-metric__label">
                  期初余额（元）
                  <a v-if="isEditable" class="fund-metric__edit" @click.prevent="openOpeningModal">
                    维护
                  </a>
                </div>
                <div class="fund-metric__value">{{ formatMoney(fundOverview.openingBalance) }}</div>
                <div v-if="openingBalanceManual" class="fund-metric__hint">手工期初</div>
                <div v-else class="fund-metric__hint">系统滚动</div>
              </div>
              <span class="fund-op">+</span>
              <div class="fund-metric">
                <div class="fund-metric__label">本期应付（元）</div>
                <div class="fund-metric__value">{{ formatMoney(fundOverview.periodPayable) }}</div>
              </div>
              <template v-if="(fundOverview.openingPaid || 0) > 0">
                <span class="fund-op">−</span>
                <div class="fund-metric">
                  <div class="fund-metric__label">期初已付（元）</div>
                  <div class="fund-metric__value">{{ formatMoney(fundOverview.openingPaid) }}</div>
                </div>
              </template>
              <span class="fund-op">−</span>
              <div class="fund-metric">
                <div class="fund-metric__label">本期已付（元）</div>
                <div class="fund-metric__value">{{ formatMoney(fundOverview.periodPaid) }}</div>
              </div>
            </div>
          </div>

          <div class="stat-row">
            <div class="stat-card">
              <div class="stat-card__label">账面金额</div>
              <div class="stat-card__value is-book">¥ {{ formatMoney(bookAmount) }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">追加/补差金额</div>
              <div class="stat-card__value is-fee">¥ {{ formatSignedAdjust(feeAdjustAmount) }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">争议调整</div>
              <div class="stat-card__value is-dispute">
                ¥ {{ formatSignedAdjust(disputeAdjustAmount) }}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">确认金额</div>
              <div class="stat-card__value is-confirm">¥ {{ formatMoney(confirmedAmount) }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">计划付款日</div>
              <div class="stat-card__value is-date">{{ record.plannedPaymentDate || '—' }}</div>
            </div>
          </div>

          <div v-if="paymentCalcTip" class="payment-tip">{{ paymentCalcTip }}</div>
          <div v-if="openDisputeCount > 0" class="dispute-tip is-hang">
            有
            {{ openDisputeCount }}
            行争议挂起：差额争议确认额仍按账面；整笔争议该行暂不计入确认应付。谈拢后核销再改确认额。
            <template v-if="disputeAdjustAmount !== 0">
              （当前相对账面 {{ formatSignedAdjust(disputeAdjustAmount) }}，多为整笔挂起）
            </template>
          </div>
          <div v-else-if="disputeAdjustAmount !== 0" class="dispute-tip is-resolved">
            争议已闭环，相对账面调整
            {{ formatSignedAdjust(disputeAdjustAmount) }}；确认金额已按结论计算。
          </div>
          <div
            v-if="record.invoiceStatus === '已开票' || record.invoiceStatus === '部分收票'"
            class="invoice-tip"
          >
            {{ record.invoiceStatus }}：累计票面 ¥ {{ formatMoney(record.invoiceAmount) }}／共
            {{ invoiceRecords.length }} 张
            <template v-if="record.invoiceStatus === '部分收票'">
              （未收票余额 ¥ {{ formatMoney(invoiceRemainToReceive) }}）
            </template>
          </div>

          <DetailSectionCard title="基本信息">
            <div class="settle-basic-section">
              <div class="meta-bar">
                <div v-for="item in metaItems" :key="item.key" class="meta-item">
                  <span class="field-label">{{ item.label }}</span>
                  <span class="field-value" :title="item.value">{{ item.value }}</span>
                </div>
              </div>
              <div class="info-grid">
                <div
                  v-for="field in basicFields"
                  :key="field.key"
                  class="info-item"
                  :class="{ 'info-item-full': field.fullRow }"
                >
                  <span class="field-label">{{ field.label }}</span>
                  <span class="field-value" :title="field.value">{{ field.value }}</span>
                </div>
              </div>
            </div>
          </DetailSectionCard>

          <DetailSectionCard title="结算明细">
            <template v-if="isEditable" #extra>
              <a-button type="link" size="small" @click="openFeeModal">追加费用/补差</a-button>
            </template>
            <template v-if="groupedLines.length">
              <div v-for="group in groupedLines" :key="group.poKey" class="po-group">
                <div class="po-group-title">
                  {{
                    group.poKey === '__fee__'
                      ? '费用 / 补差'
                      : `采购单 ${group.purchaseOrderNo || '—'}`
                  }}
                  <span class="po-group-amount">小计 ¥ {{ formatMoney(group.amount) }}</span>
                </div>
                <a-table
                  :columns="columns"
                  :data-source="group.lines"
                  row-key="id"
                  size="small"
                  :pagination="false"
                  :scroll="{ x: 1680 }"
                >
                  <template #bodyCell="{ column, record: row, index }">
                    <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                    <template v-else-if="column.key === 'lineStatus'">
                      <a-tag :color="row.lineStatusColor">{{ row.lineStatus }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'sourceType'">
                      <a-tag :color="row.sourceTagColor">{{ row.sourceLabel }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'sourceDocNo'">
                      <a
                        v-if="
                          row.sourceType !== 'fee' && row.sourceType !== 'adjust' && row.sourceDocNo
                        "
                        class="link-code"
                        @click.prevent="openSource(row)"
                      >
                        {{ row.sourceDocNo }}
                      </a>
                      <span v-else>{{ row.sourceDocNo || '—' }}</span>
                    </template>
                    <template v-else-if="column.key === 'docDate'">
                      {{ row.docDate }}
                    </template>
                    <template v-else-if="column.key === 'itemInfo'">
                      <span :title="row.itemInfoText">{{ row.itemInfoText }}</span>
                    </template>
                    <template v-else-if="column.key === 'settleQtyText'">
                      {{ row.settleQtyText }}
                    </template>
                    <template v-else-if="column.key === 'unitPrice'">
                      {{ formatMoney(row.unitPrice) }}
                    </template>
                    <template v-else-if="column.key === 'amount'">
                      <span :class="{ 'is-neg': Number(row.amount) < 0 }">
                        {{ formatMoney(row.amount) }}
                      </span>
                    </template>
                    <template v-else-if="column.key === 'disputeScope'">
                      <a-tag v-if="row.disputeScope === 'full'" color="red">整笔</a-tag>
                      <a-tag v-else-if="row.disputeStatus" color="blue">差额</a-tag>
                      <span v-else>—</span>
                    </template>
                    <template v-else-if="column.key === 'disputeClaimAmount'">
                      {{
                        row.disputeStatus && row.disputeClaimAmount != null
                          ? `¥ ${formatMoney(row.disputeClaimAmount)}`
                          : '—'
                      }}
                    </template>
                    <template v-else-if="column.key === 'disputeHangAmount'">
                      <span v-if="row.disputeStatus" class="is-neg">
                        ¥ {{ formatMoney(row.disputeHangAmount) }}
                      </span>
                      <span v-else>—</span>
                    </template>
                    <template v-else-if="column.key === 'disputeStatus'">
                      <a-tag v-if="row.disputeStatus === 'open'" color="orange">待处理</a-tag>
                      <a-tag v-else-if="row.disputeStatus === 'resolved'" color="green">
                        {{ disputeResultLabel(row.disputeResult) }}
                      </a-tag>
                      <span v-else>—</span>
                    </template>
                    <template v-else-if="column.key === 'lineConfirmAmount'">
                      {{ formatMoney(row.lineConfirmAmount) }}
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <a-space :size="8">
                        <a
                          v-if="isEditable && (!row.disputeStatus || row.disputeStatus === 'open')"
                          @click="openRegisterDispute(row)"
                        >
                          {{ row.disputeStatus === 'open' ? '改争议' : '登记争议' }}
                        </a>
                        <a
                          v-if="row.disputeStatus === 'open' && (isEditable || isConfirmed)"
                          @click="openResolveDispute(row)"
                        >
                          核销处理
                        </a>
                        <a
                          v-else-if="row.disputeStatus === 'resolved'"
                          @click="showDisputeReadonly(row)"
                        >
                          争议详情
                        </a>
                        <a
                          v-if="isEditable && row.sourceType === 'fee'"
                          class="danger-link"
                          @click="onRemoveFee(row)"
                        >
                          删除
                        </a>
                      </a-space>
                    </template>
                    <template v-else>
                      {{ row[column.dataIndex] ?? '—' }}
                    </template>
                  </template>
                </a-table>
              </div>
            </template>
            <a-empty v-else description="暂无明细" />
            <div class="detail-footer-tip">
              {{
                openDisputeCount > 0
                  ? `有 ${openDisputeCount} 行争议挂起：差额不影响确认额；整笔行暂不计入。谈拢后点「核销处理」闭环。`
                  : disputeAdjustAmount !== 0
                    ? `争议已闭环，确认金额 = 账面 ${formatSignedAdjust(disputeAdjustAmount)}。`
                    : '本单暂无争议，核对通过后可直接确认对账。'
              }}
            </div>
          </DetailSectionCard>
        </template>

        <template v-else-if="activeTab === 'invoice'">
          <DetailSectionCard title="发票信息">
            <div class="settle-basic-section">
              <div class="info-grid">
                <div v-for="field in invoiceFields" :key="field.key" class="info-item">
                  <span class="field-label">{{ field.label }}</span>
                  <span class="field-value" :title="field.value">{{ field.value }}</span>
                </div>
              </div>
            </div>
            <div class="entry-title" style="margin-top: 16px">收票登记记录</div>
            <a-table
              :columns="invoiceRecordColumns"
              :data-source="invoiceRecords"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无收票登记' }"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'invoiceAmount'">
                  ¥ {{ formatMoney(row.invoiceAmount) }}
                </template>
                <template v-else-if="column.key === 'taxRate'">
                  {{ row.taxRate != null && row.taxRate !== '' ? `${Number(row.taxRate)}` : '—' }}
                </template>
                <template v-else-if="column.key === 'invoiceTaxAmount'">
                  {{
                    row.invoiceTaxAmount != null && row.invoiceTaxAmount !== ''
                      ? `¥ ${formatMoney(row.invoiceTaxAmount)}`
                      : '—'
                  }}
                </template>
                <template v-else>{{ row[column.dataIndex] || '—' }}</template>
              </template>
            </a-table>
          </DetailSectionCard>
        </template>

        <template v-else-if="activeTab === 'payment'">
          <DetailSectionCard title="付款信息">
            <div class="settle-basic-section">
              <div class="info-grid">
                <div v-for="field in paymentFields" :key="field.key" class="info-item">
                  <span class="field-label">{{ field.label }}</span>
                  <span class="field-value" :title="field.value">{{ field.value }}</span>
                </div>
              </div>
            </div>
            <div class="entry-title" style="margin-top: 16px">付款登记记录</div>
            <div class="entry-sub-tip">
              按每次登记汇总；若冲抵往期/他单，展开可看同批次全部分配关联。
            </div>
            <a-table
              :columns="paymentBatchColumns"
              :data-source="paymentBatches"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无付款登记' }"
              :expanded-row-keys="paymentExpandedKeys"
              @expand="onPaymentBatchExpand"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'totalAmount'">
                  ¥ {{ formatMoney(row.totalAmount) }}
                </template>
                <template v-else-if="column.key === 'currentAmount'">
                  ¥ {{ formatMoney(row.currentAmount) }}
                </template>
                <template v-else-if="column.key === 'relatedAmount'">
                  <span :class="{ 'is-linkish': row.relatedAmount > 0 }">
                    ¥ {{ formatMoney(row.relatedAmount) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'role'">
                  <a-tag :color="row.isEntry ? 'blue' : 'default'">
                    {{ row.isEntry ? '本单登记' : '他单冲入' }}
                  </a-tag>
                </template>
                <template v-else>{{ row[column.dataIndex] || '—' }}</template>
              </template>
              <template #expandedRowRender="{ record: batch }">
                <div class="payment-batch-detail">
                  <div class="payment-batch-detail__title">
                    本批次分配明细
                    <span
                      v-if="batch.entrySettleNo && !batch.isEntry"
                      class="payment-batch-detail__meta"
                    >
                      （由 {{ batch.entrySettleNo }} 登记）
                    </span>
                  </div>
                  <a-table
                    :columns="paymentAllocColumns"
                    :data-source="batch.allocations"
                    row-key="id"
                    size="small"
                    bordered
                    :pagination="false"
                  >
                    <template #bodyCell="{ column, record: alloc }">
                      <template v-if="column.key === 'settleNo'">
                        <a
                          v-if="alloc.settleId && !alloc.isCurrent"
                          @click="goSettleDetail(alloc.settleId, alloc.settleNo)"
                        >
                          {{ alloc.settleNo || '—' }}
                        </a>
                        <span v-else>
                          {{ alloc.settleNo || '—' }}
                          <a-tag v-if="alloc.isCurrent" color="processing" class="inline-tag">
                            本单
                          </a-tag>
                        </span>
                      </template>
                      <template v-else-if="column.key === 'targetType'">
                        {{
                          alloc.targetType === 'opening'
                            ? '期初余额'
                            : alloc.isCurrent
                              ? '本期确认'
                              : '历史账单'
                        }}
                      </template>
                      <template v-else-if="column.key === 'amount'">
                        ¥ {{ formatMoney(alloc.amount) }}
                      </template>
                      <template v-else>{{ alloc[column.dataIndex] || '—' }}</template>
                    </template>
                  </a-table>
                </div>
              </template>
            </a-table>
          </DetailSectionCard>
        </template>

        <template v-else-if="activeTab === 'logs'">
          <DetailSectionCard title="操作日志">
            <a-table
              :columns="logColumns"
              :data-source="operationLogs"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无操作日志' }"
            />
          </DetailSectionCard>
        </template>
      </div>

      <PurchaseSettlePrintModal v-model:open="printModalOpen" :settle="record" />
      <ExportExcelModal
        v-model:open="exportModalOpen"
        v-model:settings="exportFieldSettings"
        :default-settings="defaultExportFieldSettings"
        :filtered-count="exportLineRows.length"
        :selected-count="0"
        @export="doExport"
      />

      <a-modal
        v-model:open="registerDisputeOpen"
        title="登记行争议"
        ok-text="确认挂出"
        destroy-on-close
        @ok="submitRegisterDispute"
      >
        <div v-if="disputeTargetLine" class="modal-line-meta">
          {{ disputeTargetLine.itemInfoText }}／本行账面 ¥
          {{ formatMoney(disputeTargetLine.amount) }}
        </div>
        <a-form layout="vertical">
          <a-form-item label="挂起性质" required>
            <a-radio-group v-model:value="registerDisputeForm.scope">
              <a-radio value="diff">差额（只挂主张差，确认额仍按账面）</a-radio>
              <a-radio value="full">整笔（本行先整笔不付，确认额暂不含本行）</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item
            :label="registerDisputeForm.scope === 'full' ? '对方主张金额（可选）' : '对方主张金额'"
            :required="registerDisputeForm.scope !== 'full'"
          >
            <a-input-number
              v-model:value="registerDisputeForm.claimAmount"
              :precision="2"
              style="width: 100%"
              placeholder="填写供应商主张的本行金额"
            />
          </a-form-item>
          <div v-if="registerHangPreview" class="modal-diff-preview">
            <template v-if="registerDisputeForm.scope === 'full'">
              挂出金额（整笔）= ¥
              {{ formatMoney(Math.abs(Number(disputeTargetLine?.amount) || 0)) }}；
              挂起后本行确认额为 0，谈拢核销后再计入。
            </template>
            <template v-else-if="registerDiffPreview != null">
              系统差额（主张 − 账面）：
              <strong>{{ formatSignedAdjust(registerDiffPreview) }}</strong>
              ；挂出 ¥
              {{ formatMoney(Math.abs(registerDiffPreview)) }}。挂起时确认额仍按账面，核销后再改。
            </template>
          </div>
          <a-form-item label="差异类型">
            <a-select
              v-model:value="registerDisputeForm.diffType"
              allow-clear
              placeholder="选填，默认价差"
              style="width: 100%"
              :options="diffTypeOpts"
            />
          </a-form-item>
          <a-form-item label="争议说明" required>
            <a-textarea
              v-model:value="registerDisputeForm.disputeRemark"
              :rows="3"
              placeholder="如：单价与协议不符、跨期退货待核实、质量索赔等"
              allow-clear
            />
          </a-form-item>
          <div class="modal-hint">
            差额：只填对方主张，系统算正负差。整笔：整行先不进确认应付。均可稍后核销闭环。
          </div>
        </a-form>
      </a-modal>

      <a-modal
        v-model:open="resolveDisputeOpen"
        title="争议核销处理"
        ok-text="确认闭环"
        destroy-on-close
        @ok="submitResolveDispute"
      >
        <div v-if="disputeTargetLine" class="modal-line-meta">
          {{ disputeTargetLine.itemInfoText }}／
          {{ disputeTargetLine.disputeScope === 'full' ? '整笔' : '差额' }}／账面 ¥
          {{ formatMoney(disputeTargetLine.amount) }}
          <template v-if="disputeTargetLine.disputeClaimAmount != null">
            ／对方主张 ¥ {{ formatMoney(disputeTargetLine.disputeClaimAmount) }}（差额
            {{ formatSignedAdjust(disputeTargetLine.disputeDiffAmount) }}）
          </template>
          ／挂出 ¥ {{ formatMoney(disputeTargetLine.disputeHangAmount) }}
          <div v-if="disputeTargetLine.disputeRemark" class="modal-line-sub">
            登记说明：{{ disputeTargetLine.disputeRemark }}
          </div>
        </div>
        <a-form layout="vertical">
          <a-form-item label="处理结论" required>
            <a-radio-group v-model:value="resolveDisputeForm.result">
              <a-radio value="ours">采纳我方（按本行账面）</a-radio>
              <a-radio value="theirs">采纳对方（按对方主张）</a-radio>
              <a-radio value="split">折中（填谈妥金额）</a-radio>
              <a-radio value="cancelled">取消争议（按本行账面）</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="resolveDisputeForm.result === 'split'" label="折中谈妥金额" required>
            <a-input-number
              v-model:value="resolveDisputeForm.agreedAmount"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="结论说明" required>
            <a-textarea
              v-model:value="resolveDisputeForm.resolutionRemark"
              :rows="3"
              placeholder="谈拢结果、依据（电话/邮件/纪要等）"
              allow-clear
            />
          </a-form-item>
        </a-form>
      </a-modal>

      <a-modal
        v-model:open="readonlyDisputeOpen"
        title="争议详情"
        :footer="null"
        destroy-on-close
        @cancel="readonlyDisputeOpen = false"
      >
        <a-descriptions v-if="disputeTargetLine" :column="1" size="small" bordered>
          <a-descriptions-item label="物料">
            {{ disputeTargetLine.itemInfoText }}
          </a-descriptions-item>
          <a-descriptions-item label="本行账面">
            ¥ {{ formatMoney(disputeTargetLine.amount) }}
          </a-descriptions-item>
          <a-descriptions-item label="挂起性质">
            {{ disputeTargetLine.disputeScope === 'full' ? '整笔' : '差额' }}
          </a-descriptions-item>
          <a-descriptions-item label="对方主张">
            {{
              disputeTargetLine.disputeClaimAmount != null
                ? `¥ ${formatMoney(disputeTargetLine.disputeClaimAmount)}`
                : '—'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="挂出金额">
            ¥ {{ formatMoney(disputeTargetLine.disputeHangAmount) }}
          </a-descriptions-item>
          <a-descriptions-item label="行确认额">
            ¥ {{ formatMoney(disputeTargetLine.lineConfirmAmount) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            {{
              disputeTargetLine.disputeStatus === 'open'
                ? '待处理'
                : disputeResultLabel(disputeTargetLine.disputeResult)
            }}
          </a-descriptions-item>
          <a-descriptions-item label="登记说明">
            {{ disputeTargetLine.disputeRemark || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="结论说明">
            {{ disputeTargetLine.disputeResolutionRemark || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="闭环时间">
            {{ disputeTargetLine.disputeResolvedAt || '—' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-modal>

      <a-modal
        v-model:open="feeModalOpen"
        title="追加费用 / 补差行"
        ok-text="确认追加"
        destroy-on-close
        @ok="submitFeeLine"
      >
        <a-form layout="vertical">
          <a-form-item label="费用类型" required>
            <a-select v-model:value="feeForm.feeType" style="width: 100%" :options="feeTypeOpts" />
          </a-form-item>
          <a-form-item label="名称">
            <a-input v-model:value="feeForm.itemName" allow-clear placeholder="默认用费用类型" />
          </a-form-item>
          <a-form-item label="金额（元）" required>
            <a-input-number
              v-model:value="feeForm.amount"
              :precision="2"
              style="width: 100%"
              placeholder="正数增加应付，负数减少应付"
            />
          </a-form-item>
          <a-form-item label="备注">
            <a-textarea v-model:value="feeForm.remark" :rows="2" allow-clear />
          </a-form-item>
          <div class="modal-hint">
            用于运费、尾差、事后调价补差等对账单内调整；仅草稿或对账中可追加，计入账面与确认金额。
          </div>
        </a-form>
      </a-modal>

      <PurchaseSettleInvoicePaymentModals ref="invoicePaymentModalsRef" />

      <a-modal
        v-model:open="openingModalOpen"
        title="维护期初余额"
        ok-text="保存"
        destroy-on-close
        @ok="submitOpeningBalance"
      >
        <a-form layout="vertical">
          <a-form-item label="期初余额（元）">
            <a-input-number
              v-model:value="openingForm.openingBalance"
              :precision="2"
              style="width: 100%"
              placeholder="填写金额；点下方可恢复自动"
            />
          </a-form-item>
          <div class="modal-hint">
            用于上线切账、历史数据对不齐时的差额校正。日常往来请用系统滚动；仅草稿/对账中可改。
          </div>
          <a-button type="link" size="small" style="padding-left: 0" @click="clearOpeningBalance">
            清空并恢复系统自动汇总
          </a-button>
        </a-form>
      </a-modal>
    </template>
  </div>
</template>

<script>
export default { name: 'PurchaseSettleDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getPurchaseSettleById,
  confirmPurchaseSettle,
  unconfirmPurchaseSettle,
  deletePurchaseSettle,
  markPurchaseSettleReconciling,
  purchaseSettleState,
  resolveSettleFundOverview,
  registerPurchaseSettleLineDispute,
  resolvePurchaseSettleLineDispute,
  settleInvoicedTotal,
  settleInvoiceRemainToReceive,
  ensureSettleInvoiceRecords,
  listSettlePaymentBatches,
  updatePurchaseSettleOpeningBalance,
  addPurchaseSettleFeeLine,
  removePurchaseSettleFeeLine,
  calcSettleFeeAdjustAmount,
  FEE_TYPE_OPTIONS,
  PURCHASE_SETTLE_LINE_DISPUTE_RESULT,
  PURCHASE_SETTLE_LINE_DISPUTE_SCOPE,
} from '@/store/purchaseSettleStore'
import { buildPurchaseSettleExportRows } from '@/utils/purchaseSettleExport'
import { purchaseSettleLineExportFields } from '@/utils/exportFields/purchaseSettleExport'
import { useListExport } from '@/composables/useListExport'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import PurchaseSettlePrintModal from '@/views/procurement/components/PurchaseSettlePrintModal.vue'
import PurchaseSettleInvoicePaymentModals from '@/views/procurement/components/PurchaseSettleInvoicePaymentModals.vue'
import { buildPurchaseSettleOperationLogs } from '@/utils/purchaseSettleOperationLog'
import { DISPUTE_DIFF_TYPE_OPTIONS } from '@/store/purchaseDisputeAccrualStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { purchaseReturnState, getPurchaseReturnById } from '@/store/purchaseReturnStore'
import { getOutboundOrderById, getOutboundOrderByDocNo } from '@/store/outboundStore'
import { hasSettleUnit } from '@/utils/settleUnit'
import { formatNumber } from '@/utils/numberFormat'
import {
  getLineClaimAmount,
  getLineClaimDiffAmount,
  getLineEffectiveAmount,
  getLineHangAmount,
  getLineDisputeScope,
  formatSignedMoney,
} from '@/utils/purchaseSettleDispute'
import { useTabs } from '@/composables/useTabs'

const SOURCE_META = {
  inbound: { label: '入库', color: 'blue' },
  purchase: { label: '采购', color: 'purple' },
  return: { label: '退货', color: 'orange' },
  fee: { label: '费用', color: 'gold' },
  adjust: { label: '补差', color: 'gold' },
}

const feeTypeOpts = FEE_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const statusSteps = [
  { key: 'pending', title: '待对账', desc: '生成草稿' },
  { key: 'reconciling', title: '对账中', desc: '核对明细' },
  { key: 'confirmed', title: '已确认', desc: '双方确认' },
  { key: 'invoiced', title: '收票', desc: '可分次收票' },
  { key: 'paid', title: '已付款', desc: '付款完成' },
]

const activeTab = ref('bill')
const printModalOpen = ref(false)

const record = computed(() => {
  void purchaseSettleState.settles
  return getPurchaseSettleById(String(route.params.id || ''))
})

const exportLineRows = computed(() => {
  const settle = record.value
  if (!settle) return []
  return buildPurchaseSettleExportRows(settle).map((row, index) => {
    const line = (settle.lineItems || [])[index] || {}
    return {
      settleNo: settle.settleNo,
      supplier: settle.supplier,
      source: row.source,
      sourceDocNo: row.sourceDocNo,
      purchaseOrderNo: row.purchaseOrderNo,
      itemCode: row.itemCode,
      itemName: row.itemName,
      settleQty: Number(line.settleQty) || 0,
      settleUnit: line.settleUnit || row.settleUnit || '',
      unitPrice: Number(line.unitPrice) || 0,
      amount: Number(line.amount) || 0,
      lineConfirm: getLineEffectiveAmount(line),
      remark: row.remark || '',
    }
  })
})

const { exportModalOpen, exportFieldSettings, defaultExportFieldSettings, doExport } =
  useListExport({
    storageKey: 'purchase-settle-detail-lines',
    fieldDefinitions: purchaseSettleLineExportFields,
    getFilteredRows: () => exportLineRows.value,
    getSelectedRows: () => [],
    fileNamePrefix: '采购对账单明细',
    sheetName: '对账明细',
  })

const operationLogs = computed(() => buildPurchaseSettleOperationLogs(record.value))

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

const generateModeLabel = computed(() =>
  record.value?.generateMode === 'period' ? '按账期' : '从采购单',
)

const settleTargetLabel = computed(() => {
  const target = record.value?.settleTarget
  if (target === 'purchase_order') return '按采购单（已完成）'
  if (target === 'inbound') return '按入库'
  // 兼容旧数据
  return record.value?.generateMode === 'po' ? '按采购单（已完成）' : '按入库'
})

const statusTagColor = computed(() => {
  const row = record.value
  if (!row) return 'default'
  if (row.paymentStatus === '已付款') return 'green'
  if (row.invoiceStatus === '已开票') return 'blue'
  if (row.invoiceStatus === '部分收票') return 'processing'
  if (row.status === '已确认') return 'green'
  if (row.status === '对账中') return 'processing'
  return 'orange'
})

const statusStepIndex = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.paymentStatus === '已付款') return 4
  if (row.invoiceStatus === '已开票' || row.invoiceStatus === '部分收票') return 3
  if (row.status === '已确认') return 2
  if (row.status === '对账中') return 1
  return 0
})

const bookAmount = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.bookAmount != null && row.bookAmount !== '') return Number(row.bookAmount) || 0
  return Number(row.totalAmount) || 0
})

const feeAdjustAmount = computed(() => calcSettleFeeAdjustAmount(record.value))

const isEditable = computed(
  () => record.value?.status === '草稿' || record.value?.status === '对账中',
)
const isConfirmed = computed(() => record.value?.status === '已确认')
const canUnconfirm = computed(() => {
  const row = record.value
  if (!row || row.status !== '已确认') return false
  if (row.invoiceStatus === '已开票' || row.invoiceStatus === '部分收票') return false
  if ((row.invoiceRecords || []).length > 0) return false
  if (row.paymentStatus === '已付款') return false
  if ((Number(row.paidAmount) || 0) > 0) return false
  return true
})

const invoiceRecords = computed(() => {
  const row = record.value
  if (!row) return []
  return ensureSettleInvoiceRecords(row)
})

const invoicedTotal = computed(() => settleInvoicedTotal(record.value))
const invoiceRemainToReceive = computed(() => settleInvoiceRemainToReceive(record.value))
const canRegisterInvoice = computed(() => isConfirmed.value && invoiceRemainToReceive.value > 1e-9)

const openDisputeCount = computed(
  () => (record.value?.lineItems || []).filter((l) => l.disputeStatus === 'open').length,
)

const confirmedAmount = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.confirmedAmount != null && row.confirmedAmount !== '') {
    return Number(row.confirmedAmount) || 0
  }
  return (row.lineItems || []).reduce((s, l) => s + getLineEffectiveAmount(l), 0)
})

/** 确认 − 账面；正=多认，负=少认 */
const disputeAdjustAmount = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.disputeAdjustAmount != null && row.disputeAdjustAmount !== '') {
    return Number(row.disputeAdjustAmount) || 0
  }
  return Number(confirmedAmount.value) - Number(bookAmount.value)
})

const fundOverview = computed(() => {
  void purchaseSettleState.settles
  return resolveSettleFundOverview(record.value)
})

const registerDisputeOpen = ref(false)
const resolveDisputeOpen = ref(false)
const readonlyDisputeOpen = ref(false)
const disputeTargetLine = ref(null)
const invoicePaymentModalsRef = ref(null)
const openingModalOpen = ref(false)
const openingForm = reactive({ openingBalance: null })
const feeModalOpen = ref(false)
const feeForm = reactive({
  feeType: '运费',
  itemName: '',
  amount: null,
  remark: '',
})
const diffTypeOpts = DISPUTE_DIFF_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))

const registerDisputeForm = reactive({
  scope: 'diff',
  claimAmount: null,
  diffType: '价差',
  disputeRemark: '',
})
const resolveDisputeForm = reactive({
  result: 'ours',
  agreedAmount: null,
  resolutionRemark: '',
})

const registerDiffPreview = computed(() => {
  const line = disputeTargetLine.value
  if (!line || registerDisputeForm.claimAmount == null || registerDisputeForm.claimAmount === '') {
    return null
  }
  return Number(registerDisputeForm.claimAmount) - Number(line.amount || 0)
})

const registerHangPreview = computed(() => {
  if (!disputeTargetLine.value) return false
  if (registerDisputeForm.scope === 'full') return true
  return registerDiffPreview.value != null
})

const openingBalanceManual = computed(() => {
  const row = record.value
  return row != null && row.openingBalance != null && row.openingBalance !== ''
})

function disputeResultLabel(result) {
  const map = {
    [PURCHASE_SETTLE_LINE_DISPUTE_RESULT.OURS]: '已闭环·采纳我方',
    [PURCHASE_SETTLE_LINE_DISPUTE_RESULT.THEIRS]: '已闭环·采纳对方',
    [PURCHASE_SETTLE_LINE_DISPUTE_RESULT.SPLIT]: '已闭环·折中',
    [PURCHASE_SETTLE_LINE_DISPUTE_RESULT.CANCELLED]: '已闭环·取消',
  }
  return map[result] || '已闭环'
}

function formatSignedAdjust(v) {
  return formatSignedMoney(v)
}

function openRegisterDispute(row) {
  disputeTargetLine.value = row
  registerDisputeForm.scope =
    row.disputeScope === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL || row.disputeScope === 'full'
      ? 'full'
      : 'diff'
  registerDisputeForm.claimAmount =
    row.disputeClaimAmount != null && row.disputeClaimAmount !== ''
      ? Number(row.disputeClaimAmount)
      : registerDisputeForm.scope === 'diff'
        ? Number(row.amount) || null
        : null
  registerDisputeForm.diffType = row.disputeDiffType || '价差'
  registerDisputeForm.disputeRemark = row.disputeRemark || ''
  registerDisputeOpen.value = true
}

function submitRegisterDispute() {
  const settle = record.value
  const line = disputeTargetLine.value
  if (!settle || !line) return
  if (!String(registerDisputeForm.disputeRemark || '').trim()) {
    message.warning('请填写争议说明')
    return Promise.reject()
  }
  const res = registerPurchaseSettleLineDispute(settle.id, {
    lineId: line.id,
    scope: registerDisputeForm.scope,
    claimAmount: registerDisputeForm.claimAmount,
    diffType: registerDisputeForm.diffType || '价差',
    disputeRemark: registerDisputeForm.disputeRemark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  registerDisputeOpen.value = false
}

function openResolveDispute(row) {
  disputeTargetLine.value = row
  resolveDisputeForm.result = 'ours'
  resolveDisputeForm.agreedAmount =
    row.disputeClaimAmount != null ? Number(row.disputeClaimAmount) : Number(row.amount) || 0
  resolveDisputeForm.resolutionRemark = ''
  resolveDisputeOpen.value = true
}

function submitResolveDispute() {
  const settle = record.value
  const line = disputeTargetLine.value
  if (!settle || !line) return
  const res = resolvePurchaseSettleLineDispute(settle.id, {
    lineId: line.id,
    result: resolveDisputeForm.result,
    agreedAmount: resolveDisputeForm.agreedAmount,
    resolutionRemark: resolveDisputeForm.resolutionRemark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  resolveDisputeOpen.value = false
}

function showDisputeReadonly(row) {
  disputeTargetLine.value = row
  readonlyDisputeOpen.value = true
}

function openInvoiceModal() {
  invoicePaymentModalsRef.value?.openInvoice(record.value)
}

function openPaymentModal() {
  invoicePaymentModalsRef.value?.openPayment(record.value)
}

function openOpeningModal() {
  const row = record.value
  if (!row) return
  openingForm.openingBalance =
    row.openingBalance != null && row.openingBalance !== ''
      ? Number(row.openingBalance)
      : fundOverview.value.openingBalance
  openingModalOpen.value = true
}

function submitOpeningBalance() {
  const row = record.value
  if (!row) return
  const res = updatePurchaseSettleOpeningBalance(row.id, openingForm.openingBalance)
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  openingModalOpen.value = false
}

function clearOpeningBalance() {
  openingForm.openingBalance = null
  const row = record.value
  if (!row) return
  const res = updatePurchaseSettleOpeningBalance(row.id, null)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  openingModalOpen.value = false
}

/** 列表「收票登记 / 付款登记」跳转带 ?action= */
watch(
  () => [record.value?.id, route.query.action],
  ([id, action]) => {
    if (!id || !action) return
    if (action === 'invoice' && canRegisterInvoice.value) {
      activeTab.value = 'invoice'
      openInvoiceModal()
    } else if (action === 'payment' && record.value?.paymentStatus !== '已付款') {
      activeTab.value = 'payment'
      openPaymentModal()
    }
    if (route.query.action) {
      const nextQuery = { ...route.query }
      delete nextQuery.action
      router.replace({ query: nextQuery })
    }
  },
  { flush: 'post' },
)

const paymentTermDaysText = computed(() => {
  const days = Number(record.value?.paymentTermDays)
  if (Number.isFinite(days) && days > 0) return `${days}天`
  return '—'
})

const paymentCalcTip = computed(() => {
  const row = record.value
  if (!row) return ''
  const days = Number(row.paymentTermDays)
  const start = row.paymentTermStart || '对账日'
  if (!(Number.isFinite(days) && days > 0)) return ''
  if (!row.plannedPaymentDate) {
    if (start === '开票日') {
      return '账期起算为开票日：供应商开票时间需人工补录后，按「开票日 + 账期天数」计算计划付款日。'
    }
    return ''
  }
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][dayjs(row.plannedPaymentDate).day()]
  return `付款日测算：起算「${start}」+ 账期 ${days} 天 = ${row.plannedPaymentDate}（周${weekday}）`
})

/** 基本信息采购单号：仅手动「从采购单」生成时展示，账期等其它维度显示 — */
const displayPoNos = computed(() => {
  const row = record.value
  if (!row) return '—'
  if (row.generateMode !== 'po') return '—'
  if (row.purchaseOrderNos?.length) return row.purchaseOrderNos.join('、')
  return row.purchaseOrderNo || '—'
})

const metaItems = computed(() => {
  const row = record.value
  if (!row) return []
  return [
    { key: 'status', label: '状态', value: display(row.status) },
    { key: 'invoiceStatus', label: '收票', value: display(row.invoiceStatus || '未收票') },
    {
      key: 'paymentStatus',
      label: '付款',
      value: display(
        row.paymentStatus || ((Number(row.paidAmount) || 0) > 0 ? '部分付款' : '未付款'),
      ),
    },
    { key: 'creator', label: '创建人', value: display(row.creator) },
    { key: 'createdAt', label: '创建时间', value: display(row.createdAt) },
    { key: 'confirmer', label: '确认人', value: display(row.confirmer) },
    { key: 'confirmedAt', label: '确认时间', value: display(row.confirmedAt) },
  ]
})

const basicFields = computed(() => {
  const row = record.value
  if (!row) return []
  const periodWindow =
    row.periodStart && row.periodEnd ? `${row.periodStart} ~ ${row.periodEnd}` : '—'
  return [
    { key: 'settleNo', label: '对账单号', value: display(row.settleNo) },
    { key: 'supplier', label: '供应商', value: display(row.supplier) },
    { key: 'settleTarget', label: '生成维度', value: settleTargetLabel.value },
    { key: 'generateMode', label: '生成方式', value: generateModeLabel.value },
    { key: 'purchaseOrderNo', label: '采购单号', value: displayPoNos.value },
    { key: 'settlementCycle', label: '结算周期', value: display(row.settlementCycle) },
    { key: 'paymentTermStart', label: '账期起算', value: display(row.paymentTermStart) },
    { key: 'periodKey', label: '账期', value: display(row.periodKey) },
    { key: 'periodWindow', label: '结算期间', value: periodWindow },
    { key: 'paymentTermDays', label: '账期天数', value: paymentTermDaysText.value },
    { key: 'plannedPaymentDate', label: '计划付款日期', value: display(row.plannedPaymentDate) },
    { key: 'invoiceNo', label: '发票号码', value: display(row.invoiceNo) },
    { key: 'invoiceDate', label: '开票日期', value: display(row.invoiceDate) },
    { key: 'remark', label: '备注', value: display(row.remark), fullRow: true },
  ]
})

const invoiceFields = computed(() => {
  const row = record.value
  if (!row) return []
  return [
    { key: 'invoiceStatus', label: '收票状态', value: display(row.invoiceStatus || '未收票') },
    {
      key: 'invoiceAmount',
      label: '累计票面',
      value: invoicedTotal.value > 0 ? `¥ ${formatMoney(invoicedTotal.value)}` : '—',
    },
    {
      key: 'invoiceRemain',
      label: '未收票余额',
      value: `¥ ${formatMoney(invoiceRemainToReceive.value)}`,
    },
    {
      key: 'invoiceCount',
      label: '收票笔数',
      value: String(invoiceRecords.value.length),
    },
    { key: 'invoiceDate', label: '最近开票日', value: display(row.invoiceDate) },
    {
      key: 'invoiceTaxAmount',
      label: '累计税额',
      value:
        row.invoiceTaxAmount != null && row.invoiceTaxAmount !== ''
          ? `¥ ${formatMoney(row.invoiceTaxAmount)}`
          : '—',
    },
  ]
})

const invoiceRecordColumns = [
  { title: '发票号码', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140 },
  { title: '开票日期', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 120 },
  { title: '票面金额', key: 'invoiceAmount', width: 120, align: 'right' },
  { title: '税率(%)', key: 'taxRate', width: 90, align: 'right' },
  { title: '税额', key: 'invoiceTaxAmount', width: 100, align: 'right' },
  { title: '登记人', dataIndex: 'invoicer', key: 'invoicer', width: 100 },
  { title: '登记时间', dataIndex: 'invoicedAt', key: 'invoicedAt', width: 170 },
  { title: '备注', dataIndex: 'invoiceRemark', key: 'invoiceRemark', ellipsis: true },
]

const paymentFields = computed(() => {
  const row = record.value
  if (!row) return []
  const paid = Number(row.paidAmount) || 0
  return [
    {
      key: 'paymentStatus',
      label: '付款状态',
      value: display(row.paymentStatus || (paid > 0 ? '部分付款' : '未付款')),
    },
    { key: 'confirmedAmount', label: '确认应付', value: `¥ ${formatMoney(confirmedAmount.value)}` },
    { key: 'paidAmount', label: '已付金额', value: `¥ ${formatMoney(paid)}` },
    {
      key: 'remainPay',
      label: '待付金额',
      value: `¥ ${formatMoney(Math.max(0, confirmedAmount.value - paid))}`,
    },
    { key: 'plannedPaymentDate', label: '计划付款日', value: display(row.plannedPaymentDate) },
    { key: 'paymentTermStart', label: '账期起算', value: display(row.paymentTermStart) },
    { key: 'paymentTermDays', label: '账期天数', value: paymentTermDaysText.value },
    { key: 'lastPaidRemark', label: '付款备注', value: display(row.lastPaidRemark) },
  ]
})

const paymentBatches = computed(() => {
  void purchaseSettleState.settles
  if (!record.value?.id) return []
  return listSettlePaymentBatches(record.value.id)
})

const paymentExpandedKeys = ref([])

const paymentBatchColumns = [
  { title: '登记时间', dataIndex: 'paidAt', width: 170 },
  { title: '登记人', dataIndex: 'paidBy', width: 90 },
  { title: '来源', key: 'role', width: 100 },
  { title: '本次付款合计', key: 'totalAmount', width: 120, align: 'right' },
  { title: '冲本单', key: 'currentAmount', width: 110, align: 'right' },
  { title: '冲关联单', key: 'relatedAmount', width: 110, align: 'right' },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
]

const paymentAllocColumns = [
  { title: '对账单号', key: 'settleNo', width: 160 },
  { title: '冲抵对象', key: 'targetType', width: 110 },
  { title: '金额', key: 'amount', width: 110, align: 'right' },
]

function onPaymentBatchExpand(expanded, row) {
  const key = row.id
  if (expanded) {
    if (!paymentExpandedKeys.value.includes(key)) {
      paymentExpandedKeys.value = [...paymentExpandedKeys.value, key]
    }
  } else {
    paymentExpandedKeys.value = paymentExpandedKeys.value.filter((k) => k !== key)
  }
}

function goSettleDetail(id, settleNo) {
  if (!id) return
  const path = `/settlement/purchase-settles/${id}`
  openTab(path, `采购对账 ${settleNo || ''}`)
  router.push({ name: 'settlement-purchase-settles-detail', params: { id } })
}

function resolveSourceLine(row) {
  const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
  const inboundLine = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
  const po =
    purchaseOrderState.orders.find(
      (o) => o.id === (row.purchaseOrderId || inbound?.purchaseOrderId),
    ) || null
  const poLine =
    (po?.lineItems || []).find((l) => l.id === (row.poLineId || inboundLine?.poLineId)) || null
  return { inbound, inboundLine, po, poLine }
}

function resolveLineSourceType(row) {
  if (row.sourceType === 'fee' || row.sourceType === 'adjust') return row.sourceType
  if (row.sourceType === 'return' || row.returnOrderId || row.returnOrderNo) return 'return'
  if (row.sourceType === 'purchase') return 'purchase'
  if (row.sourceType === 'inbound') return 'inbound'
  if (record.value?.settleTarget === 'purchase_order') return 'purchase'
  return 'inbound'
}

function sliceDate(val) {
  if (!val) return ''
  return String(val).slice(0, 10)
}

function resolveReturnDocDate(row) {
  const outbound =
    (row.outboundOrderId && getOutboundOrderById(row.outboundOrderId)) ||
    (row.outboundDocNo && getOutboundOrderByDocNo(row.outboundDocNo)) ||
    null
  if (outbound) {
    return (
      sliceDate(outbound.outboundDate) ||
      sliceDate(outbound.completedAt) ||
      sliceDate(outbound.outboundTime) ||
      sliceDate(outbound.createdAt) ||
      ''
    )
  }
  const ret =
    (row.returnOrderId && getPurchaseReturnById(row.returnOrderId)) ||
    purchaseReturnState.returns.find((r) => r.returnNo === row.returnOrderNo) ||
    null
  if (!ret) return ''
  const sub = (ret.outboundOrders || []).find(
    (o) => o.id === row.outboundOrderId || o.outboundOrderNo === row.outboundDocNo,
  )
  if (sub) {
    return (
      sliceDate(sub.outboundDate) || sliceDate(sub.completedAt) || sliceDate(sub.createdAt) || ''
    )
  }
  // 未入库退货无出库单：退货确认/创建日兜底
  return sliceDate(ret.confirmedAt) || sliceDate(ret.updatedAt) || sliceDate(ret.createdAt) || ''
}

function formatSettleQtyText(row, inboundLine) {
  const source = inboundLine || row
  if (hasSettleUnit(source) || hasSettleUnit(row)) {
    const qty = Number(row.settleQty ?? source.settleQty)
    const unit = row.settleUnit || source.settleUnit || ''
    if (!(Number.isFinite(qty) && qty !== 0)) return '—'
    return `${formatNumber(qty, 4)}${unit ? ` ${unit}` : ''}`
  }
  // 有采购单位：取点收数量（入库 qty / purchaseQty）
  const qty = Number(source.purchaseQty ?? source.qty ?? row.settleQty)
  const unit = source.purchaseUnit || source.unit || row.settleUnit || ''
  if (!(Number.isFinite(qty) && qty !== 0)) return '—'
  return `${formatNumber(qty, 4)}${unit ? ` ${unit}` : ''}`
}

function enrichLine(row) {
  const headerStatus = record.value?.status || '草稿'
  const { inbound, inboundLine, poLine } = resolveSourceLine(row)
  const sourceType = resolveLineSourceType(row)
  const sourceMeta = SOURCE_META[sourceType] || SOURCE_META.inbound
  const itemCode =
    row.itemCode || inboundLine?.itemCode || poLine?.itemCode || poLine?.productCode || ''
  const itemName =
    row.itemName || inboundLine?.itemName || poLine?.itemName || poLine?.productName || ''
  const isFee = sourceType === 'fee' || sourceType === 'adjust'
  const sourceDocNo = isFee
    ? row.feeType || '费用补差'
    : sourceType === 'return'
      ? row.returnOrderNo || '—'
      : row.inboundDocNo || inbound?.docNo || '—'
  const docDate = isFee
    ? sliceDate(record.value?.settleDate) || sliceDate(record.value?.createdAt) || '—'
    : sourceType === 'return'
      ? resolveReturnDocDate(row) || '—'
      : sliceDate(inbound?.inboundDate) || sliceDate(inbound?.createdAt) || '—'
  return {
    ...row,
    sourceType,
    sourceLabel: isFee ? row.feeType || sourceMeta.label : sourceMeta.label,
    sourceTagColor: sourceMeta.color,
    sourceDocNo,
    docDate,
    lineStatus:
      headerStatus === '已确认' ? '已确认' : headerStatus === '对账中' ? '对账中' : '待确认',
    lineStatusColor:
      headerStatus === '已确认' ? 'green' : headerStatus === '对账中' ? 'processing' : 'orange',
    itemCode,
    itemName,
    itemInfoText: `${itemCode} ${itemName}`.trim() || '—',
    specModel: isFee ? '—' : inboundLine?.specModel || poLine?.specModel || '—',
    material: isFee ? '—' : inboundLine?.material || poLine?.material || '—',
    orderSizeText: isFee ? '—' : inboundLine?.orderSizeText || poLine?.orderSizeText || '—',
    settleQtyText: isFee ? '1 项' : formatSettleQtyText(row, inboundLine),
    disputeScope: row.disputeStatus ? getLineDisputeScope(row) : '',
    disputeClaimAmount:
      row.disputeClaimAmount != null && row.disputeClaimAmount !== ''
        ? getLineClaimAmount(row)
        : null,
    disputeDiffAmount:
      row.disputeStatus && row.disputeClaimAmount != null && row.disputeClaimAmount !== ''
        ? getLineClaimDiffAmount(row)
        : 0,
    disputeHangAmount: row.disputeStatus ? getLineHangAmount(row) : 0,
    disputeStatus: row.disputeStatus || '',
    disputeResult: row.disputeResult || '',
    disputeRemark: row.disputeRemark || '',
    disputeResolutionRemark: row.disputeResolutionRemark || '',
    disputeResolvedAt: row.disputeResolvedAt || '',
    lineConfirmAmount: getLineEffectiveAmount(row),
  }
}

/** 按采购单分组，恢复明细上方「采购单 xxxx」标题 */
const groupedLines = computed(() => {
  void inboundOrderState.orders
  void purchaseOrderState.orders
  void purchaseReturnState.returns
  const lines = record.value?.lineItems || []
  const map = new Map()
  lines.forEach((line) => {
    const enriched = enrichLine(line)
    const isFee = enriched.sourceType === 'fee' || enriched.sourceType === 'adjust'
    const poNo = isFee
      ? '费用/补差'
      : enriched.purchaseOrderNo || record.value?.purchaseOrderNo || '未关联采购单'
    const poId = isFee
      ? '__fee__'
      : enriched.purchaseOrderId || record.value?.purchaseOrderId || poNo
    const key = poId || poNo
    if (!map.has(key)) {
      map.set(key, {
        poKey: key,
        purchaseOrderId: poId,
        purchaseOrderNo: poNo,
        lines: [],
        amount: 0,
      })
    }
    const g = map.get(key)
    g.lines.push(enriched)
    g.amount += Number(enriched.amount) || 0
  })
  const list = [...map.values()]
  list.sort((a, b) => {
    if (a.poKey === '__fee__') return 1
    if (b.poKey === '__fee__') return -1
    return 0
  })
  return list
})

const columns = [
  { title: '序号', key: 'index', width: 60 },
  { title: '状态', key: 'lineStatus', width: 90 },
  { title: '来源', key: 'sourceType', width: 80 },
  { title: '来源单号', key: 'sourceDocNo', width: 140 },
  { title: '单据日期', key: 'docDate', width: 110 },
  { title: '物料信息', key: 'itemInfo', width: 180, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90, ellipsis: true },
  {
    title: '订货尺寸',
    dataIndex: 'orderSizeText',
    key: 'orderSizeText',
    width: 110,
    ellipsis: true,
  },
  { title: '结算数量', key: 'settleQtyText', width: 110 },
  { title: '结算单价', key: 'unitPrice', width: 90, align: 'right' },
  { title: '金额', key: 'amount', width: 100, align: 'right' },
  { title: '性质', key: 'disputeScope', width: 70 },
  { title: '对方主张', key: 'disputeClaimAmount', width: 110, align: 'right' },
  { title: '挂出金额', key: 'disputeHangAmount', width: 100, align: 'right' },
  { title: '争议', key: 'disputeStatus', width: 120 },
  { title: '行确认额', key: 'lineConfirmAmount', width: 100, align: 'right' },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 2)
}

function goBack() {
  router.push('/settlement/purchase-settles')
}

function openSource(row) {
  if (row?.sourceType === 'fee' || row?.sourceType === 'adjust') {
    message.info('费用/补差行为手工追加，无上游来源单')
    return
  }
  if (row?.sourceType === 'return' || row?.returnOrderId) {
    if (!row.returnOrderId) {
      message.info('无关联退货单')
      return
    }
    const path = `/procurement/purchase-returns/${row.returnOrderId}`
    openTab(path, row.returnOrderNo || row.sourceDocNo || '退货详情')
    router.push({
      name: 'procurement-purchase-returns-detail',
      params: { id: row.returnOrderId },
    })
    return
  }
  if (!row?.inboundOrderId) {
    message.info('无关联入库单')
    return
  }
  const path = `/inventory/inbound/${row.inboundOrderId}`
  openTab(path, row.inboundDocNo || row.sourceDocNo || '入库详情')
  router.push({ name: 'inventory-inbound-detail', params: { id: row.inboundOrderId } })
}

function onConfirm() {
  const row = record.value
  if (!row) return
  const hangTip =
    openDisputeCount.value > 0
      ? `有 ${openDisputeCount.value} 行争议挂起，将按确认金额 ¥ ${formatMoney(confirmedAmount.value)} 推进（差额挂起仍含账面；整笔挂起该行已剔除）；争议可确认后继续核销。`
      : disputeAdjustAmount.value !== 0
        ? `确认后按调整后金额 ¥ ${formatMoney(confirmedAmount.value)} 占用结算数量。`
        : '确认后将占用入库行的结算数量，不可撤销。'
  Modal.confirm({
    title: `确认对账单 ${row.settleNo}？`,
    content: hangTip,
    okText: '确认',
    onOk() {
      const res = confirmPurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onUnconfirm() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: `反确认对账单 ${row.settleNo}？`,
    content: '将退回草稿并释放入库/退货占量；仅未开票且未付款时可操作。',
    okText: '反确认',
    onOk() {
      const res = unconfirmPurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onMarkReconciling() {
  const row = record.value
  if (!row) return
  const res = markPurchaseSettleReconciling(row.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
}

function openFeeModal() {
  feeForm.feeType = '运费'
  feeForm.itemName = ''
  feeForm.amount = null
  feeForm.remark = ''
  feeModalOpen.value = true
}

function submitFeeLine() {
  const row = record.value
  if (!row) return
  const res = addPurchaseSettleFeeLine(row.id, {
    feeType: feeForm.feeType,
    itemName: feeForm.itemName,
    amount: feeForm.amount,
    remark: feeForm.remark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  feeModalOpen.value = false
}

function onRemoveFee(row) {
  const settle = record.value
  if (!settle || !row) return
  Modal.confirm({
    title: '删除费用/补差行？',
    content: `${row.itemName || row.feeType || ''} ¥ ${formatMoney(row.amount)}`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = removePurchaseSettleFeeLine(settle.id, row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onDelete() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: `删除对账单 ${row.settleNo}？`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = deletePurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      goBack()
    },
  })
}
</script>

<style lang="less" scoped>
@label-width: 96px;

.purchase-settle-detail-page {
  --psd-ink: #1c2b3a;
  --psd-muted: #5b6b7c;
  --psd-line: rgba(28, 43, 58, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}

.detail-panel {
  background: #fff;
  border: 1px solid var(--psd-line);
  border-radius: 12px;
  padding: 16px 18px 8px;
  margin-bottom: 10px;
}

.step-desc {
  font-size: 12px;
  color: var(--psd-muted);
}

.fund-overview {
  background: #fff;
  border: 1px solid var(--psd-line);
  border-radius: 12px;
  padding: 14px 18px 16px;
  margin-bottom: 10px;
  box-shadow: 0 6px 16px rgba(28, 43, 58, 0.04);
}

.fund-overview__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--psd-ink);
}

.fund-overview__bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #cf1322;
}

.fund-overview__formula {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 12px;
}

.fund-metric {
  min-width: 108px;
}

.fund-metric__label {
  font-size: 12px;
  color: var(--psd-muted);
  margin-bottom: 4px;
}

.fund-metric__value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #d48806;
  line-height: 1.2;
}

.fund-metric.is-end .fund-metric__value {
  color: #cf1322;
  font-size: 24px;
}

.fund-op {
  padding-bottom: 4px;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.25);
}

.dispute-tip,
.invoice-tip {
  margin: -2px 0 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.dispute-tip {
  background: rgba(207, 19, 34, 0.06);
  color: #a8071a;
}

.dispute-tip.is-hang {
  background: rgba(250, 173, 20, 0.12);
  color: #ad6800;
}

.dispute-tip.is-resolved {
  background: rgba(82, 196, 26, 0.08);
  color: #389e0d;
}

.modal-line-meta {
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}

.modal-line-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.invoice-tip {
  background: rgba(22, 119, 255, 0.06);
  color: var(--psd-muted);
}

.modal-diff-preview {
  margin: -4px 0 12px;
  padding: 8px 10px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.75);
}

.modal-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--psd-line);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 6px 16px rgba(28, 43, 58, 0.04);
}

.stat-card__label {
  font-size: 13px;
  color: var(--psd-muted);
  margin-bottom: 6px;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.stat-card__value.is-book {
  color: #c2410c;
}
.stat-card__value.is-fee {
  color: #d48806;
}
.stat-card__value.is-dispute {
  color: #cf1322;
}
.stat-card__value.is-confirm {
  color: #389e0d;
}
.stat-card__value.is-date {
  color: var(--psd-ink);
  font-size: 22px;
}

.detail-tabs-wrap {
  margin-top: 8px;
}

.tab-action-row {
  margin-top: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.fund-metric__edit {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
}

.fund-metric__hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.aging-preview {
  margin-top: 8px;
}

.aging-preview__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.aging-preview :deep(.aging-row-skip) {
  color: rgba(0, 0, 0, 0.45);
  background: #fafafa;
}

.is-muted {
  color: rgba(0, 0, 0, 0.35);
}

.modal-hint.is-warn {
  color: #d48806;
}

.entry-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.entry-sub-tip {
  margin: -4px 0 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.payment-batch-detail {
  padding: 4px 8px 8px;
  background: #fafafa;
}

.payment-batch-detail__title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.payment-batch-detail__meta {
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.inline-tag {
  margin-left: 6px;
}

.is-linkish {
  color: #1677ff;
}

.payment-tip {
  margin: -2px 0 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(22, 119, 255, 0.06);
  color: var(--psd-muted);
  font-size: 13px;
  line-height: 1.5;
}

.settle-basic-section {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.field-label {
  flex: 0 0 @label-width;
  width: @label-width;
  padding-right: 8px;
  text-align: right;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.info-item-full {
  grid-column: 1 / -1;

  .field-value {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.po-group {
  margin-bottom: 16px;

  &:last-of-type {
    margin-bottom: 0;
  }
}

.po-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(28, 43, 58, 0.04);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--psd-ink);
}

.po-group-amount {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--psd-muted);
}

.detail-footer-tip {
  margin-top: 10px;
  font-size: 13px;
  color: var(--psd-muted);
}

.danger-link {
  color: #cf1322;
}

.is-neg {
  color: #cf1322;
}

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fund-overview__formula {
    gap: 10px 8px;
  }

  .fund-op {
    display: none;
  }
}
</style>
