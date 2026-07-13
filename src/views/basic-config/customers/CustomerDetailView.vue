<template>
  <div class="customer-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-page-head">
          <div class="head-title">
            <span class="name">{{ record.name }}</span>
            <span class="code">{{ record.code }}</span>
            <a-tag :color="customerDataStatusColor(record.dataStatus)">{{
              record.dataStatus
            }}</a-tag>
            <a-tag :color="customerGradeColor(record.customerGrade)">{{
              record.customerGrade
            }}</a-tag>
          </div>
          <a-space class="head-actions">
            <a-button type="primary" size="small" @click="handleEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <a-tabs v-model:active-key="activeTab" type="card" class="detail-tabs">
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="org" tab="组织与资质" />
          <a-tab-pane key="contact" tab="联系信息" />
          <a-tab-pane key="address" tab="地址信息" />
          <a-tab-pane key="business" tab="商务与交易" />
          <a-tab-pane key="discount" tab="折扣设置" />
          <a-tab-pane key="logistics" tab="物流与交付" />
          <a-tab-pane key="finance" tab="财务信息" />
          <a-tab-pane key="system" tab="系统信息" />
        </a-tabs>

        <div class="section-card">
          <template v-if="activeTab === 'basic'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="客户编码">{{ record.code }}</a-descriptions-item>
              <a-descriptions-item label="客户名称">{{ record.name }}</a-descriptions-item>
              <a-descriptions-item label="客户简称">{{
                record.shortName || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="客户类型">{{ typeName }}</a-descriptions-item>
              <a-descriptions-item label="客户分级">{{
                record.customerGrade || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="外部编号">{{
                record.externalCode || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="业务员">{{
                record.salesperson || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="启用状态">{{ record.status || '—' }}</a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">{{
                record.remark || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </template>

          <template v-else-if="activeTab === 'org'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="统一社会信用代码">{{
                record.unifiedSocialCreditCode || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="法定代表人">{{
                record.legalRepresentative || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="注册资本">{{
                record.registeredCapital || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="成立日期">{{
                record.establishedDate || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="所属行业">{{
                record.industry || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="企业规模">{{
                record.enterpriseScale || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="营业执照附件" :span="3">
                <template v-if="licenseFileNames.length">
                  <a-space wrap>
                    <a-tag v-for="name in licenseFileNames" :key="name">{{ name }}</a-tag>
                  </a-space>
                </template>
                <template v-else>—</template>
              </a-descriptions-item>
            </a-descriptions>
          </template>

          <template v-else-if="activeTab === 'contact'">
            <a-table
              :columns="contactColumns"
              :data-source="record.contacts || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'isDefault'">
                  {{ row.isDefault ? '是' : '否' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] ?? '—' }}
                </template>
              </template>
              <template #emptyText>
                <a-empty :image="false" description="暂无联系信息" />
              </template>
            </a-table>
          </template>

          <template v-else-if="activeTab === 'address'">
            <a-table
              :columns="addressColumns"
              :data-source="record.addresses || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'region'">
                  {{ [row.province, row.city, row.district].filter(Boolean).join(' / ') || '—' }}
                </template>
                <template v-else-if="column.key === 'isDefault'">
                  {{ row.isDefault ? '是' : '否' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] ?? '—' }}
                </template>
              </template>
              <template #emptyText>
                <a-empty :image="false" description="暂无地址信息" />
              </template>
            </a-table>
          </template>

          <template v-else-if="activeTab === 'business'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="币种">{{ record.currency || '—' }}</a-descriptions-item>
              <a-descriptions-item label="结算方式">{{
                record.settlementMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算周期">{{
                record.settlementCycle || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算类型">{{
                record.settlementType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="信用额度">{{
                record.creditLimit ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="信用可用余额">{{
                record.creditAvailableBalance ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="信用警戒线(%)">{{
                record.creditWarningPercent ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="税率(%)">{{ record.taxRate ?? '—' }}</a-descriptions-item>
            </a-descriptions>
          </template>

          <template v-else-if="activeTab === 'discount'">
            <a-descriptions bordered size="small" :column="3" class="discount-summary">
              <a-descriptions-item label="价目等级">{{
                record.priceLevel || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="默认折扣">{{
                formatDiscount(record.defaultDiscountRate)
              }}</a-descriptions-item>
              <a-descriptions-item label="协议价条目">
                {{ (record.customerPriceList || []).length }}
              </a-descriptions-item>
            </a-descriptions>
            <a-table
              :columns="priceListColumns"
              :data-source="record.customerPriceList || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              class="price-list-table"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'agreementDiscountRate'">
                  {{
                    row.agreementDiscountRate != null && row.agreementDiscountRate < 1
                      ? formatDiscount(row.agreementDiscountRate)
                      : '—'
                  }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] ?? '—' }}
                </template>
              </template>
              <template #emptyText>
                <a-empty :image="false" description="暂无产品协议价" />
              </template>
            </a-table>
          </template>

          <template v-else-if="activeTab === 'logistics'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="默认交货方式">{{
                record.defaultDeliveryMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="默认承运商">{{
                record.defaultCarrier || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="运费承担方">{{
                record.freightBearer || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="交货提前期(天)">{{
                record.deliveryLeadTimeDays ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="包装要求">{{
                record.packagingRequirements || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="特殊要求" :span="3">{{
                record.specialRequirements || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </template>

          <template v-else-if="activeTab === 'finance'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="开户银行">{{
                record.openingBank || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="银行账号">{{
                record.bankAccount || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="开票名称">{{
                record.invoiceName || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="开票税号">{{
                record.invoiceTaxNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="开票地址/电话" :span="2">{{
                record.invoiceAddressPhone || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="默认发票类型">{{
                record.defaultInvoiceType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="收票人/收票地址" :span="3">{{
                record.invoiceRecipientInfo || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </template>

          <template v-else-if="activeTab === 'system'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
              <a-descriptions-item label="创建时间">{{
                record.createdAt || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="数据状态">
                <a-tag :color="customerDataStatusColor(record.dataStatus)">{{
                  record.dataStatus || '—'
                }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="最后修改人">{{
                record.lastModifier || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="修改时间">{{
                record.updatedAt || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="所属组织">{{
                record.orgBelonging || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="审核人">{{ record.approver || '—' }}</a-descriptions-item>
              <a-descriptions-item label="审核时间">{{
                record.approvedAt || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="扩展字段" :span="3">{{
                extendedFieldsText
              }}</a-descriptions-item>
            </a-descriptions>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该客户" />
    </a-spin>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customerState, getCustomerById } from '@/store/customerStore'
import { getCustomerTypeById } from '@/store/customerTypeStore'
import { customerDataStatusColor, customerGradeColor } from '@/constants/customerMaster'
import { formatDiscountRatePercent } from '@/utils/salesOrderPricing'
import { useTabs } from '@/composables/useTabs'
import { useFormCreatePage } from '@/composables/useFormCreatePage'

defineOptions({ name: 'CustomerDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const { goBack } = useFormCreatePage('/basic-config/customers')

const loading = ref(false)
const activeTab = ref('basic')

const record = computed(() => {
  void customerState.customers
  return getCustomerById(route.params.id)
})

const typeName = computed(() => getCustomerTypeById(record.value?.customerTypeId)?.name || '—')

const licenseFileNames = computed(() =>
  (record.value?.businessLicenseFiles || [])
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean),
)

const contactColumns = [
  { title: '联系人', dataIndex: 'name', width: 100 },
  { title: '联系人职务', dataIndex: 'title', width: 110 },
  { title: '联系电话', dataIndex: 'phone', width: 120 },
  { title: '手机', dataIndex: 'mobile', width: 120 },
  { title: '邮箱', dataIndex: 'email', width: 160 },
  { title: '传真', dataIndex: 'fax', width: 120 },
  { title: '默认', key: 'isDefault', width: 70, align: 'center' },
]

const addressColumns = [
  { title: '地址类型', dataIndex: 'addressType', width: 100 },
  { title: '省/市/区', key: 'region', width: 180 },
  { title: '详细地址', dataIndex: 'detailAddress', width: 200, ellipsis: true },
  { title: '邮编', dataIndex: 'zipCode', width: 90 },
  { title: '默认', key: 'isDefault', width: 70, align: 'center' },
  { title: '收货人', dataIndex: 'consignee', width: 100 },
  { title: '电话', dataIndex: 'consigneePhone', width: 120 },
]

const priceListColumns = [
  { title: '产品编码', dataIndex: 'productCode', width: 160 },
  { title: '协议折扣', key: 'agreementDiscountRate', width: 100 },
  { title: '协议单价(不含税)', dataIndex: 'agreementUnitPriceExTax', width: 140 },
]

const extendedFieldsText = computed(() => {
  const ext = record.value?.extendedFields
  if (!ext || !Object.keys(ext).length) return '—'
  try {
    return JSON.stringify(ext)
  } catch {
    return '—'
  }
})

function formatDiscount(rate) {
  if (!rate || rate >= 1) return '无折扣'
  return formatDiscountRatePercent(rate)
}

function handleEdit() {
  if (!record.value) return
  const path = `/basic-config/customers/${record.value.id}/edit`
  openTab(path, '编辑客户')
  router.push(path)
}
</script>

<style lang="less" scoped>
.customer-detail-page {
  .detail-page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    background: #fff;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .head-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;

    .name {
      font-size: 20px;
      font-weight: 600;
    }

    .code {
      color: rgba(0, 0, 0, 0.45);
      font-size: 13px;
    }
  }

  .detail-tabs {
    margin-bottom: 0;
  }

  .section-card {
    background: #fff;
    border-radius: 0 0 6px 6px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .discount-summary {
    margin-bottom: 12px;
  }

  .price-list-table {
    margin-top: 4px;
  }
}
</style>
