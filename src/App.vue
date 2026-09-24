<template>
  <a-config-provider :theme="antdTheme" :locale="antdLocale">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { theme as antdThemeToken } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { effectiveTheme, initUiAppearance } from '@/store/uiAppearanceStore'

dayjs.locale('zh-cn')

/** 全局中文；确认框主按钮用「确认」（规范亦允许「确定」） */
const antdLocale = {
  ...zhCN,
  Modal: {
    ...zhCN.Modal,
    okText: '确认',
    cancelText: '取消',
    justOkText: '知道了',
  },
}

onMounted(() => {
  initUiAppearance()
})

const antdTheme = computed(() => ({
  algorithm:
    effectiveTheme.value === 'dark'
      ? antdThemeToken.darkAlgorithm
      : antdThemeToken.defaultAlgorithm,
  token: {
    colorPrimary: effectiveTheme.value === 'dark' ? '#4096ff' : '#1677ff',
    /* 表单控件统一 32px（含 size="small"，对齐 form-fields.mdc） */
    controlHeight: 32,
    controlHeightSM: 32,
  },
}))
</script>
