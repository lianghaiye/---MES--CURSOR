<template>
  <div class="supplier-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-page-head">
          <div class="head-title">
            <span class="name">{{ record.name }}</span>
            <span class="code">{{ record.code }}</span>
            <a-tag :color="supplierStatusColor(record.status)">{{ record.status }}</a-tag>
            <a-space :size="4" wrap>
              <a-tag v-for="role in record.supplierRoles || []" :key="role" color="blue">{{
                role
              }}</a-tag>
            </a-space>
          </div>
          <a-space class="head-actions">
            <a-button type="primary" size="small" @click="handleEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <a-tabs v-model:active-key="activeTab" type="card" class="detail-tabs">
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="business" tab="商务/采购" />
          <a-tab-pane key="org" tab="组织与资质" />
          <a-tab-pane key="contact" tab="联系信息" />
          <a-tab-pane key="finance" tab="财务信息" />
          <a-tab-pane key="system" tab="系统信息" />
        </a-tabs>

        <div class="section-card">
          <template v-if="activeTab === 'basic'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="供应商编码">{{ record.code }}</a-descriptions-item>
              <a-descriptions-item label="供应商名称">{{ record.name }}</a-descriptions-item>
              <a-descriptions-item label="供应商简称">{{
                record.shortName || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="供应商类型">{{
                formatSupplierRoles(record.supplierRoles)
              }}</a-descriptions-item>
              <a-descriptions-item label="供应商分类">{{ categoryName }}</a-descriptions-item>
              <a-descriptions-item label="规模">{{
                record.enterpriseScale || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">{{
                record.remark || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </template>

          <template v-else-if="activeTab === 'business'">
            <a-descriptions bordered size="small" :column="3">
              <a-descriptions-item label="结算方式">{{
                record.settlementMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算类型">{{
                record.settlementType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算周期">{{
                record.settlementCycle || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="付款方式">{{
                record.paymentMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="供货周期">{{
                record.supplyCycleDays != null ? `${record.supplyCycleDays}天` : '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="最小起订量">{{
                record.minOrderQty ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="报价方式">{{
                record.quoteMethod || '—'
              }}</a-descriptions-item>
            </a-descriptions>
            <div class="section-subtitle">主要供应物料</div>
            <a-table
              :columns="materialColumns"
              :data-source="record.mainMaterials || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #emptyText>
                <a-empty :image="false" description="暂无主要供应物料" />
              </template>
            </a-table>
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
              <a-descriptions-item label="开票地址/电话">{{
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
              <a-descriptions-item label="最后修改人">{{
                record.lastModifier || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="最后修改时间">{{
                record.updatedAt || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </template>
        </div>
      </template>
      <a-empty v-else description="供应商不存在" />
    </a-spin>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSupplierById } from '@/store/supplierStore'
import { getSupplierCategoryById } from '@/store/supplierCategoryStore'
import { formatSupplierRoles, supplierStatusColor } from '@/constants/supplierMaster'
import { useTabs } from '@/composables/useTabs'

defineOptions({ name: 'SupplierDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const activeTab = ref('basic')

const record = computed(() => getSupplierById(route.params.id))

const categoryName = computed(
  () => getSupplierCategoryById(record.value?.supplierCategoryId)?.name || '—',
)

const licenseFileNames = computed(() =>
  (record.value?.businessLicenseFiles || []).map((file) => file.name).filter(Boolean),
)

const contactColumns = [
  { title: '姓名', dataIndex: 'name', width: 100 },
  { title: '职务', dataIndex: 'title', width: 100 },
  { title: '电话', dataIndex: 'phone', width: 120 },
  { title: '手机', dataIndex: 'mobile', width: 120 },
  { title: '邮箱', dataIndex: 'email', width: 160 },
  { title: '默认', key: 'isDefault', width: 70 },
]

const materialColumns = [
  { title: '物料编码', dataIndex: 'materialCode', width: 140 },
  { title: '物料名称', dataIndex: 'materialName', width: 180 },
  { title: '规格型号', dataIndex: 'specModel', width: 160 },
  { title: '备注', dataIndex: 'remark', width: 160 },
]

function handleEdit() {
  if (!record.value) return
  const path = `/basic-config/suppliers/${record.value.id}/edit`
  openTab(path, '编辑供应商')
  router.push(path)
}

function goBack() {
  const path = '/basic-config/suppliers'
  openTab(path, '供应商档案')
  router.push(path)
}
</script>

<style scoped>
.supplier-detail-page {
  .detail-page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding: 16px;
    background: #fff;
    border-radius: 6px;
  }

  .head-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    .name {
      font-size: 18px;
      font-weight: 600;
    }

    .code {
      color: rgba(0, 0, 0, 0.45);
      font-size: 13px;
    }
  }

  .detail-tabs {
    margin-bottom: 12px;
  }

  .section-card {
    background: #fff;
    border-radius: 6px;
    padding: 16px;
  }

  .section-subtitle {
    margin: 16px 0 8px;
    font-weight: 500;
    font-size: 13px;
  }
}
</style>
