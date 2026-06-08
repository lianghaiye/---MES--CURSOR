<template>
  <a-modal
    v-model:open="visible"
    title="生成补料单"
    width="480px"
    :footer="null"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="物品名称">
        <span>{{ record?.itemName || '物料/产品名称' }}</span>
      </a-form-item>
      <a-form-item label="数量">
        <span>{{ record?.qty ?? 1 }}</span>
      </a-form-item>
      <a-form-item label="补料方式" required>
        <a-select
          v-model:value="form.replenishMethod"
          placeholder="自动带出原单据中的值，支持修改"
          :options="replenishOpts"
        />
      </a-form-item>
    </a-form>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleNext">下一步</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'ScrapReplenishModal' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getDictOptions } from '@/store/systemDictStore'
import { replenishScrapOrder } from '@/store/scrapOrderStore'

const props = defineProps({
  open: Boolean,
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const form = reactive({ replenishMethod: undefined })
const replenishOpts = computed(() => getDictOptions('replenish_method'))

watch(
  () => props.open,
  (v) => {
    if (!v || !props.record) return
    form.replenishMethod = props.record.replenishMethod || '库存补料'
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleNext() {
  if (!props.record) return
  const res = replenishScrapOrder(props.record.id, { ...form })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  const method = form.replenishMethod
  if (method === '采购补料') {
    message.success('已生成采购申请单')
  } else {
    message.success('已在相应仓库生成待处理领料出库单')
  }
  emit('saved', res.order)
  emit('update:open', false)
}
</script>

<style scoped>
.modal-footer {
  margin-top: 16px;
  text-align: right;
}
</style>
