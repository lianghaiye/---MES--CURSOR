<template>
  <a-modal
    v-model:open="visible"
    title="报废审批"
    width="560px"
    :footer="null"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form
      layout="horizontal"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
      class="audit-form"
    >
      <a-form-item label="报废单号">
        <span>{{ record?.scrapNo }}</span>
      </a-form-item>
      <a-form-item label="物品名称">
        <span>{{ record?.itemName }}</span>
      </a-form-item>
      <a-form-item label="报废原因" required>
        <a-select
          v-model:value="form.scrapReason"
          placeholder="请选择"
          :options="reasonOpts"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="补料方式">
        <a-select
          v-if="form.needReplenish"
          v-model:value="form.replenishMethod"
          placeholder="请选择"
          :options="replenishOpts"
        />
        <span v-else class="readonly-text">-</span>
      </a-form-item>
      <a-form-item label="处理方式" required>
        <a-select
          v-model:value="form.processMethod"
          placeholder="请选择"
          :options="processOpts"
          allow-clear
        />
      </a-form-item>

      <template v-if="form.processMethod === '退库'">
        <a-form-item label="退库仓库" required>
          <a-select
            v-model:value="form.warehouse"
            placeholder="请选择仓库"
            :options="warehouseOpts"
            @change="onWarehouseChange"
          />
        </a-form-item>
        <a-form-item label="仓库负责人" required>
          <a-select
            v-model:value="form.warehouseKeeper"
            placeholder="请选择负责人"
            :options="keeperOpts"
          />
        </a-form-item>
      </template>

      <template v-if="form.processMethod === '报废'">
        <a-form-item label="处理结果" required>
          <a-select
            v-model:value="form.processResult"
            placeholder="请选择"
            :options="resultOpts"
            allow-clear
          />
        </a-form-item>
        <template v-if="form.processResult === '财物变现'">
          <a-form-item label="入库仓库" required>
            <a-select
              v-model:value="form.warehouse"
              placeholder="请选择仓库"
              :options="warehouseOpts"
              @change="onWarehouseChange"
            />
          </a-form-item>
          <a-form-item label="仓库负责人" required>
            <a-select
              v-model:value="form.warehouseKeeper"
              placeholder="请选择负责人"
              :options="keeperOpts"
            />
          </a-form-item>
        </template>
      </template>

      <a-form-item label="审批意见">
        <a-textarea v-model:value="form.auditComment" :rows="3" placeholder="驳回时必填" />
      </a-form-item>
    </a-form>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button danger @click="handleReject">驳回</a-button>
        <a-button type="primary" @click="handleApprove">确认通过</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'ScrapAuditModal' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getDictOptions } from '@/store/systemDictStore'
import { approveScrapOrder, rejectScrapOrder } from '@/store/scrapOrderStore'
import { warehouseOptions, personInChargeOptions } from '@/mock/workOrderOptions'
import { resolveWarehouseKeeper } from '@/utils/scrapOrderUtils'

const props = defineProps({
  open: Boolean,
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const form = reactive({
  scrapReason: '',
  replenishMethod: '库存补料',
  needReplenish: true,
  processMethod: undefined,
  processResult: undefined,
  warehouse: undefined,
  warehouseKeeper: undefined,
  auditComment: '',
})

const reasonOpts = computed(() => getDictOptions('scrap_reason'))
const replenishOpts = computed(() => getDictOptions('replenish_method'))
const processOpts = computed(() => getDictOptions('process_method'))
const resultOpts = computed(() => getDictOptions('process_result'))
const warehouseOpts = warehouseOptions.map((v) => ({ label: v, value: v }))
const keeperOpts = personInChargeOptions.map((v) => ({ label: v, value: v }))

watch(
  () => props.open,
  (v) => {
    if (!v || !props.record) return
    const r = props.record
    form.scrapReason = r.scrapReason || undefined
    form.needReplenish = r.needReplenish !== false && r.replenishMethod !== '-'
    form.replenishMethod = form.needReplenish ? r.replenishMethod || '库存补料' : '-'
    form.processMethod = r.processMethod || undefined
    form.processResult = r.processResult || undefined
    form.warehouse = r.warehouse || undefined
    form.warehouseKeeper = r.warehouseKeeper || undefined
    form.auditComment = r.auditComment || ''
  },
)

function onWarehouseChange(wh) {
  form.warehouseKeeper = resolveWarehouseKeeper(wh)
}

function handleCancel() {
  emit('update:open', false)
}

function handleApprove() {
  if (!props.record) return
  const res = approveScrapOrder(props.record.id, {
    ...form,
    auditor: '管理员',
  })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('审批通过')
  emit('saved', res.order)
  emit('update:open', false)
}

function handleReject() {
  if (!props.record) return
  const res = rejectScrapOrder(props.record.id, {
    ...form,
    auditor: '管理员',
  })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已驳回')
  emit('saved', res.order)
  emit('update:open', false)
}
</script>

<style scoped>
.audit-form {
  margin-top: 8px;
}
.readonly-text {
  color: rgba(0, 0, 0, 0.45);
}
.modal-footer {
  margin-top: 16px;
  text-align: right;
}
</style>
