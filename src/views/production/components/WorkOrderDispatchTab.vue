<template>
  <div class="dispatch-tab">
    <a-table
      :columns="columns"
      :data-source="workOrder.processes"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      v-model:expanded-row-keys="expandedKeys"
      :row-expandable="(record) => record.hasFeeding"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'process'">
          <div class="process-cell">
            <component :is="iconMap[record.icon] || ToolOutlined" class="process-icon" />
            <span>{{ record.name }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'executors'">
          <div class="executor-cell" @click="openPersonModal(record)">
            <template v-if="record.executors?.length">
              <a-tag v-for="name in record.executors" :key="name" color="blue">{{ name }}</a-tag>
            </template>
            <span v-else class="placeholder">请选择执行人</span>
          </div>
        </template>
        <template v-else-if="column.key === 'feeding'">
          <span v-if="record.hasFeeding" class="feeding-hint">展开配置投料</span>
          <span v-else class="muted">—</span>
        </template>
      </template>

      <template #expandedRowRender="{ record }">
        <div v-if="record.hasFeeding" class="feeding-panel">
          <div class="feeding-title">投料配置</div>
          <div v-for="(item, idx) in record.feedingMaterials" :key="item.id" class="feeding-row">
            <span class="feeding-label">物料</span>
            <a-select
              v-model:value="item.materialId"
              show-search
              allow-clear
              placeholder="请选择物料"
              style="width: 220px"
              :options="materialOptions"
              @change="(val) => onMaterialChange(item, val)"
            />
            <span class="feeding-label">数量</span>
            <a-input-number v-model:value="item.qty" :min="0" placeholder="请输入数量" />
            <a-space>
              <a-button type="text" size="small" @click="addFeedingRow(record)">
                <PlusOutlined />
              </a-button>
              <a-button
                type="text"
                size="small"
                danger
                :disabled="record.feedingMaterials.length <= 1"
                @click="removeFeedingRow(record, idx)"
              >
                <DeleteOutlined />
              </a-button>
            </a-space>
          </div>
        </div>
      </template>
    </a-table>

    <div class="dispatch-footer">
      <a-space>
        <a-button type="primary" @click="emitDispatch('dispatch')">下发</a-button>
        <a-button type="primary" ghost @click="emitDispatch('dispatchAndStart')">
          下发并开始
        </a-button>
      </a-space>
    </div>

    <SelectPersonModal
      v-model:open="personModalOpen"
      :selected="editingProcess?.executors || []"
      @confirm="onPersonConfirm"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  ScissorOutlined,
  SyncOutlined,
  ToolOutlined,
  ExperimentOutlined,
  InboxOutlined,
  ShoppingOutlined,
  BuildOutlined,
  ClusterOutlined,
  SettingOutlined,
  FireOutlined,
  HeatMapOutlined,
  CloudOutlined,
  AuditOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  ScanOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import SelectPersonModal from './SelectPersonModal.vue'
import { mockFeedingMaterials } from '@/mock/workOrderMaster'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['dispatch', 'dispatch-and-start'])

const iconMap = {
  ScissorOutlined,
  SyncOutlined,
  ToolOutlined,
  ExperimentOutlined,
  InboxOutlined,
  ShoppingOutlined,
  BuildOutlined,
  ClusterOutlined,
  SettingOutlined,
  FireOutlined,
  HeatMapOutlined,
  CloudOutlined,
  AuditOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  ScanOutlined,
}

const columns = [
  { title: '序号', dataIndex: 'index', width: 64, align: 'center' },
  { title: '工序', key: 'process', width: 160 },
  { title: '选择执行人', key: 'executors', width: 240 },
  { title: '投料', key: 'feeding', width: 120 },
]

const personModalOpen = ref(false)
const editingProcess = ref(null)
const expandedKeys = ref(props.workOrder.processes.filter((p) => p.hasFeeding).map((p) => p.id))

const materialOptions = computed(() =>
  mockFeedingMaterials.map((m) => ({ label: m.name, value: m.id })),
)

function openPersonModal(process) {
  editingProcess.value = process
  personModalOpen.value = true
}

function onPersonConfirm(names) {
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

function validateDispatch() {
  const missing = props.workOrder.processes.filter((p) => !p.executors?.length)
  if (missing.length) {
    message.error(`请为工序「${missing.map((p) => p.name).join('、')}」选择执行人`)
    return false
  }
  return true
}

function emitDispatch(type) {
  if (!validateDispatch()) return
  if (type === 'dispatch') emit('dispatch')
  else emit('dispatch-and-start')
}
</script>

<style lang="less" scoped>
.process-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .process-icon {
    font-size: 16px;
    color: #1677ff;
  }
}

.executor-cell {
  min-height: 32px;
  cursor: pointer;
  padding: 4px 0;

  .placeholder {
    color: rgba(0, 0, 0, 0.35);
  }

  &:hover {
    background: #fafafa;
  }
}

.feeding-hint {
  color: #1677ff;
  font-size: 12px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.feeding-panel {
  padding: 8px 12px 4px 48px;
  background: #fafafa;

  .feeding-title {
    font-weight: 500;
    margin-bottom: 8px;
  }

  .feeding-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .feeding-label {
    color: rgba(0, 0, 0, 0.65);
    font-size: 13px;
  }
}

.dispatch-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
