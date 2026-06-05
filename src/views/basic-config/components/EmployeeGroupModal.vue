<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑' : '新增'"
    width="900px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="group-form">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="编码" name="code" required>
            <a-input-group compact>
              <a-input
                v-model:value="form.code"
                placeholder="请输入编码"
                style="width: calc(100% - 88px)"
              />
              <a-button @click="genCode">生成编码</a-button>
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="名称" name="name" required>
            <a-input v-model:value="form.name" placeholder="请输入名称" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工作中心" name="workCenter" required>
            <a-select
              v-model:value="form.workCenter"
              placeholder="请选择工作中心"
              :options="workCenterOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="岗位" name="position" required>
            <a-select
              v-model:value="form.position"
              placeholder="请选择岗位"
              :options="positionOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="组长" name="leaderId" required>
            <a-select
              v-model:value="form.leaderId"
              show-search
              placeholder="请选择组长"
              :options="employeeOpts"
              @change="onLeaderChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="允许生成任务">
            <a-switch v-model:checked="form.allowTaskGen" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="组长参与生产">
            <a-switch v-model:checked="form.leaderParticipates" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="执行人多选">
            <a-switch v-model:checked="form.multiExecutor" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="状态">
            <a-switch
              v-model:checked="statusEnabled"
              checked-children="启用"
              un-checked-children="禁用"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" placeholder="请输入备注" :rows="2" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="worker-section">
      <a-button type="primary" size="small" @click="openWorkerPicker">
        <PlusOutlined />
        选择工人
      </a-button>
      <a-table
        class="worker-table"
        :columns="workerCols"
        :data-source="form.workers"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isLeader'">
            <a-tag v-if="record.isLeader" color="blue">组长</a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button type="link" size="small" danger @click="removeWorker(record.id)"
              >删除</a-button
            >
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无数据" />
        </template>
      </a-table>
    </div>

    <SelectPersonModal
      v-model:open="workerPickerOpen"
      :selected="form.workers.map((w) => w.name)"
      @confirm="onWorkersSelected"
    />

    <template #footer>
      <a-button @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" @click="handleSave">
        <SaveOutlined />
        保存
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import SelectPersonModal from '@/views/production/components/SelectPersonModal.vue'
import { mockEmployees } from '@/mock/workOrderMaster'
import {
  addEmployeeGroup,
  updateEmployeeGroup,
  workCenterOptions,
  positionOptions,
} from '@/store/employeeGroupStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const workerPickerOpen = ref(false)

const form = reactive({
  code: '',
  name: '',
  workCenter: undefined,
  position: undefined,
  leaderId: undefined,
  leaderName: '',
  allowTaskGen: true,
  leaderParticipates: true,
  multiExecutor: true,
  status: '启用',
  remark: '',
  workers: [],
})

const rules = {
  code: [{ required: true, message: '请输入编码' }],
  name: [{ required: true, message: '请输入名称' }],
  workCenter: [{ required: true, message: '请选择工作中心' }],
  position: [{ required: true, message: '请选择岗位' }],
  leaderId: [{ required: true, message: '请选择组长' }],
}

const isEdit = computed(() => !!props.record?.id)
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const positionOpts = positionOptions.map((v) => ({ label: v, value: v }))
const employeeOpts = mockEmployees.map((e) => ({ label: e.name, value: e.id }))

const statusEnabled = computed({
  get: () => form.status === '启用',
  set: (val) => {
    form.status = val ? '启用' : '禁用'
  },
})

const workerCols = [
  { title: '#', width: 48, customRender: ({ index }) => index + 1 },
  { title: '工人', dataIndex: 'name' },
  { title: '组长', key: 'isLeader', width: 80 },
  { title: '操作', key: 'actions', width: 80 },
]

watch(
  () => props.open,
  (val) => {
    if (!val) return
    if (props.record) {
      Object.assign(form, {
        code: props.record.code,
        name: props.record.name,
        workCenter: props.record.workCenter,
        position: props.record.position,
        leaderId: props.record.leaderId,
        leaderName: props.record.leaderName,
        allowTaskGen: props.record.allowTaskGen,
        leaderParticipates: props.record.leaderParticipates,
        multiExecutor: props.record.multiExecutor,
        status: props.record.status,
        remark: props.record.remark || '',
        workers: [...(props.record.workers || [])],
      })
    } else {
      Object.assign(form, {
        code: '',
        name: '',
        workCenter: undefined,
        position: undefined,
        leaderId: undefined,
        leaderName: '',
        allowTaskGen: true,
        leaderParticipates: true,
        multiExecutor: true,
        status: '启用',
        remark: '',
        workers: [],
      })
    }
  },
)

function genCode() {
  form.code = `WG${dayjs().format('YYYYMMDD')}${String(Math.floor(Math.random() * 900) + 100)}`
}

function onLeaderChange(leaderId) {
  const emp = mockEmployees.find((e) => e.id === leaderId)
  form.leaderName = emp?.name || ''
  if (emp) {
    const exists = form.workers.some((w) => w.id === emp.id)
    if (!exists) {
      form.workers.unshift({ id: emp.id, name: emp.name, isLeader: true })
    }
    form.workers = form.workers.map((w) => ({ ...w, isLeader: w.id === emp.id }))
  }
}

function openWorkerPicker() {
  workerPickerOpen.value = true
}

function onWorkersSelected(names) {
  const leaderName = form.leaderName
  form.workers = names.map((name) => {
    const emp = mockEmployees.find((e) => e.name === name)
    return {
      id: emp?.id || `tmp-${name}`,
      name,
      isLeader: name === leaderName,
    }
  })
}

function removeWorker(id) {
  if (id === form.leaderId) {
    message.warning('不能删除组长，请先更换组长')
    return
  }
  form.workers = form.workers.filter((w) => w.id !== id)
}

function handleCancel() {
  emit('update:open', false)
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (!form.workers.length) {
    message.warning('请至少选择一名工人')
    return
  }
  const payload = { ...form }
  if (isEdit.value) {
    updateEmployeeGroup(props.record.id, payload)
    message.success('员工组别已更新')
  } else {
    addEmployeeGroup(payload)
    message.success('员工组别已创建')
  }
  emit('saved')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.group-form {
  margin-bottom: 12px;
}

.worker-section {
  margin-top: 8px;

  .worker-table {
    margin-top: 12px;
  }
}
</style>
