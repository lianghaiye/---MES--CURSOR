<template>
  <a-dropdown :trigger="['click']" placement="bottomRight">
    <a-tooltip title="外观设置">
      <a class="appearance-trigger" @click.prevent>
        <BgColorsOutlined />
      </a>
    </a-tooltip>
    <template #overlay>
      <div class="appearance-panel" @click.stop>
        <div class="panel-section">
          <div class="panel-title">系统主题</div>
          <a-radio-group
            :value="uiAppearanceState.theme"
            class="panel-options"
            @update:value="setTheme"
          >
            <a-radio v-for="opt in THEME_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </div>
        <div class="panel-divider" />
        <div class="panel-section">
          <div class="panel-title">系统字号</div>
          <div class="panel-hint">控制列表表格字号与行高</div>
          <a-radio-group
            :value="uiAppearanceState.tableDensity"
            class="panel-options"
            @update:value="setTableDensity"
          >
            <a-radio v-for="opt in FONT_SIZE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </div>
      </div>
    </template>
  </a-dropdown>
</template>

<script setup>
import { BgColorsOutlined } from '@ant-design/icons-vue'
import {
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
  setTableDensity,
  setTheme,
  uiAppearanceState,
} from '@/store/uiAppearanceStore'
</script>

<style lang="less">
.appearance-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--primary, #1677ff);
  cursor: pointer;
  line-height: 1;
}

.appearance-panel {
  min-width: 220px;
  padding: 12px 14px;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow:
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
}

.appearance-panel .panel-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.appearance-panel .panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1, rgba(0, 0, 0, 0.88));
}

.appearance-panel .panel-hint {
  font-size: 12px;
  color: var(--text-3, rgba(0, 0, 0, 0.45));
  margin-top: -4px;
}

.appearance-panel .panel-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.appearance-panel .panel-divider {
  height: 1px;
  margin: 12px 0;
  background: var(--divider, #f0f0f0);
}
</style>
