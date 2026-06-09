<template>
  <a-tooltip title="列显隐">
    <a-button type="text" size="small" @click="emit('click')">
      <SettingOutlined />
    </a-button>
  </a-tooltip>
</template>

<script setup>
import { SettingOutlined } from '@ant-design/icons-vue'

const emit = defineEmits(['click'])
</script>
