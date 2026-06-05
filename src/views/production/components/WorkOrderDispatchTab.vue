<template>
  <div class="dispatch-tab">
    <a-table
      :columns="columns"
      :data-source="workOrder.processes"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      class="process-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'process'">
          <div class="process-cell">
            <span class="process-icon-wrap">
              <SettingOutlined />
            </span>
            <span>{{ record.name }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'processCode'">
          {{ record.processCode || '-' }}
        </template>
        <template v-else-if="column.key === 'resourceType'">
          <a-tag :color="record.resourceType === '工人小组' ? 'blue' : 'default'">
            {{ record.resourceType || '工人' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'executors'">
          <a class="executor-link" @click.prevent="openExecutorModal(record)">
            <template v-if="record.executors?.length">
              {{ record.executors.join('、') }}
            </template>
            <template v-else>
              {{ record.resourceType === '工人小组' ? '请选择执行组别' : '请选择执行人' }}
            </template>
          </a>
        </template>
        <template v-else-if="column.key === 'feeding'">
          <div v-if="record.hasFeeding" class="feeding-cell">
            <div v-for="(item, idx) in record.feedingMaterials" :key="item.id" class="feeding-row">
              <a-select
                v-model:value="item.materialId"
                show-search
                allow-clear
                placeholder="请选择物料"
                style="width: 150px"
                size="small"
                :options="materialOptions"
                @change="(val) => onMaterialChange(item, val)"
              />
              <a-input-number
                v-model:value="item.qty"
                :min="0"
                size="small"
                placeholder="数量"
                style="width: 80px"
              />
              <a-button
                type="link"
                size="small"
                danger
                :disabled="record.feedingMaterials.length <= 1"
                @click="removeFeedingRow(record, idx)"
              >
                删除
              </a-button>
            </div>
            <a-button type="link" size="small" class="add-feed-btn" @click="addFeedingRow(record)">
              + 增加投料
            </a-button>
          </div>
          <span v-else class="muted">—</span>
        </template>
      </template>
    </a-table>

    <div class="dispatch-footer">
      <a-space :size="8">
        <a-button type="primary" size="small" @click="emitSave">保存</a-button>
        <a-button size="small" @click="emit('cancel')">取消</a-button>
      </a-space>
    </div>

    <SelectPersonModal
      v-model:open="personModalOpen"
      :selected="editingProcess?.executors || []"
      @confirm="onPersonConfirm"
    />
    <SelectGroupModal
      v-model:open="groupModalOpen"
      :selected="editingProcess?.executors || []"
      @confirm="onGroupConfirm"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import SelectPersonModal from './SelectPersonModal.vue'
import SelectGroupModal from './SelectGroupModal.vue'
import { mockFeedingMaterials } from '@/mock/workOrderMaster'
import { validateProcessExecutors } from '@/utils/workOrderDispatchHelpers'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['save', 'cancel'])

const columns = [
  { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
  { title: '工序名称', key: 'process', width: 120 },
  { title: '工序编码', key: 'processCode', width: 100 },
  { title: '资源类型', key: 'resourceType', width: 90 },
  { title: '选择执行人', key: 'executors', width: 160 },
  { title: '投料信息', key: 'feeding' },
]

const personModalOpen = ref(false)
const groupModalOpen = ref(false)
const editingProcess = ref(null)

const materialOptions = computed(() =>
  mockFeedingMaterials.map((m) => ({ label: m.name, value: m.id })),
)

function openExecutorModal(process) {
  editingProcess.value = process
  if (process.resourceType === '工人小组') {
    groupModalOpen.value = true
  } else {
    personModalOpen.value = true
  }
}

function onPersonConfirm(names) {
  if (editingProcess.value) {
    editingProcess.value.executors = names
  }
}

function onGroupConfirm(names) {
  if (editingProcess.value) {
    editingProcess.value.executors = names
  }
}

function onMaterialChange(item, materialId) {
  const mat = mockFeedingMaterials.find((m) => m.id === materialId)
  item.materialName = mat?.name || ''
}

function addFeedingRow(process) {
  process.feedingMaterials.push({
    id: `feed-${Date.now()}`,
    materialId: undefined,
    materialName: '',
    qty: null,
  })
}

function removeFeedingRow(process, index) {
  process.feedingMaterials.splice(index, 1)
}

function emitSave() {
  if (!validateProcessExecutors(props.workOrder.processes)) return
  emit('save')
}
</script>

<style lang="less" scoped>
.process-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 6px 8px;
    font-size: 12px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 4px 8px;
    font-size: 12px;
  }
}

.process-cell {
  display: flex;
  align-items: center;
  gap: 6px;

  .process-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: #e6f4ff;
    color: #1677ff;
    font-size: 12px;
  }
}

.executor-link {
  color: #1677ff;
}

.feeding-cell {
  .feeding-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .add-feed-btn {
    padding-left: 0;
    height: 22px;
    font-size: 12px;
  }
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.dispatch-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
}
</style>
