<template>
  <a-modal
    :open="open"
    title="导入"
    width="560px"
    destroy-on-close
    :confirm-loading="submitting"
    @cancel="handleCancel"
  >
    <div class="import-body">
      <div class="file-row">
        <span class="label">选择文件:</span>
        <a-space>
          <a-button type="primary" ghost @click="handleDownloadTemplate">
            <DownloadOutlined />
            模板下载
          </a-button>
          <a-upload :before-upload="beforeUpload" :show-upload-list="false" accept=".xls,.xlsx">
            <a-button type="primary">
              <UploadOutlined />
              点击上传
            </a-button>
          </a-upload>
        </a-space>
      </div>

      <div v-if="fileName" class="file-name">已选择：{{ fileName }}</div>

      <div class="hint-box">
        <div class="hint-title">提示:</div>
        <ol class="hint-list">
          <li>仅支持上传.xls或.xlsx格式的文件</li>
          <li>文件大小不能超过5MB</li>
          <li>校验通过的数据将直接入库</li>
          <li>校验失败的数据将写入错误信息文件，并在每行末尾追加错误说明</li>
        </ol>
      </div>

      <a-alert
        v-if="result"
        class="result-alert"
        :type="resultAlertType"
        show-icon
        :message="resultTitle"
        :description="result.remark"
      />

      <div v-if="result?.failCount" class="error-action">
        <a-button type="link" @click="result.downloadErrors?.()">
          <DownloadOutlined />
          下载错误信息文件
        </a-button>
      </div>
    </div>

    <template #footer>
      <a-space>
        <a-button type="primary" :loading="submitting" @click="handleConfirm">
          <CheckOutlined />
          确定
        </a-button>
        <a-button @click="handleCancel">
          <CloseOutlined />
          取消
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { validateImportFile } from '@/utils/excelImport'

const props = defineProps({
  open: Boolean,
  /** { moduleName, downloadTemplate, runImport } */
  importDef: { type: Object, required: true },
})

const emit = defineEmits(['update:open', 'done'])

const file = ref(null)
const fileName = ref('')
const submitting = ref(false)
const result = ref(null)

const resultAlertType = computed(() => {
  if (!result.value) return 'info'
  if (result.value.successCount > 0 && result.value.failCount > 0) return 'warning'
  if (result.value.successCount > 0) return 'success'
  return 'error'
})

const resultTitle = computed(() => {
  if (!result.value) return ''
  const { successCount, failCount } = result.value
  if (successCount > 0 && failCount > 0) return `部分成功：成功 ${successCount}，失败 ${failCount}`
  if (successCount > 0) return `导入成功：${successCount} 条`
  return `导入失败：${failCount} 条`
})

watch(
  () => props.open,
  (v) => {
    if (v) {
      file.value = null
      fileName.value = ''
      result.value = null
      submitting.value = false
    }
  },
)

function handleDownloadTemplate() {
  try {
    props.importDef.downloadTemplate()
    message.success('模板已下载')
  } catch (err) {
    message.error(err?.message || '模板下载失败')
  }
}

function beforeUpload(f) {
  const check = validateImportFile(f)
  if (!check.ok) {
    message.error(check.message)
    return false
  }
  file.value = f
  fileName.value = f.name
  result.value = null
  return false
}

async function handleConfirm() {
  if (result.value) {
    emit('update:open', false)
    return
  }
  const check = validateImportFile(file.value)
  if (!check.ok) {
    message.warning(check.message)
    return
  }
  submitting.value = true
  try {
    const res = await props.importDef.runImport(file.value)
    result.value = res
    if (res.successCount > 0) {
      message.success(res.remark || '导入完成')
      emit('done', res)
    } else {
      message.error(res.remark || '导入失败')
    }
  } catch (err) {
    message.error(err?.message || '导入失败')
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  emit('update:open', false)
}
</script>

<style scoped>
.import-body {
  padding: 4px 0 8px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.label {
  color: rgba(0, 0, 0, 0.85);
  white-space: nowrap;
}

.file-name {
  margin: -4px 0 12px 72px;
  color: #1677ff;
  font-size: 13px;
}

.hint-box {
  border: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 6px;
  padding: 12px 16px;
}

.hint-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.hint-list {
  margin: 0;
  padding-left: 20px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.8;
}

.result-alert {
  margin-top: 16px;
}

.error-action {
  margin-top: 4px;
}
</style>
