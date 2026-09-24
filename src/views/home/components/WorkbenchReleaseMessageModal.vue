<template>
  <a-modal
    :open="open"
    :footer="null"
    width="760px"
    destroy-on-close
    class="release-msg-modal"
    @cancel="emit('update:open', false)"
  >
    <template #title>
      <span class="modal-title">消息详情</span>
    </template>

    <div v-if="release" class="msg-wrap">
      <h2 class="msg-title">
        <template v-if="release.versionTag">{{ release.versionTag }} </template>{{ release.title }}
      </h2>
      <div class="msg-meta">
        <span>发布人：{{ release.publisher || '系统管理员' }}</span>
        <span>{{ release.publishedAt || release.publishDate || '—' }}</span>
      </div>

      <div class="msg-section">
        <div class="section-label">内容</div>
        <div class="msg-html" v-html="safeHtml" />
      </div>

      <div class="msg-actions">
        <button
          type="button"
          class="react-btn"
          :class="{ active: myReaction === 'like' }"
          @click="onReact('like')"
        >
          <LikeOutlined />
          <span>点赞</span>
          <em v-if="likeCount">{{ likeCount }}</em>
        </button>
        <button
          type="button"
          class="react-btn"
          :class="{ active: myReaction === 'dislike' }"
          @click="onReact('dislike')"
        >
          <DislikeOutlined />
          <span>踩他</span>
          <em v-if="dislikeCount">{{ dislikeCount }}</em>
        </button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
import { LikeOutlined, DislikeOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { reactRelease, getReleaseReaction } from '@/store/workbenchStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  release: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'reacted'])

const safeHtml = computed(() => {
  const html = props.release?.contentHtml || props.release?.content || ''
  return String(html)
})

const likeCount = computed(() => Number(props.release?.likeCount || 0))
const dislikeCount = computed(() => Number(props.release?.dislikeCount || 0))

const myReaction = computed(() => {
  if (!props.release?.id) return ''
  return getReleaseReaction(props.release.id)
})

function onReact(type) {
  if (!props.release?.id) return
  const res = reactRelease(props.release.id, type)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('reacted')
}
</script>

<script>
export default { name: 'WorkbenchReleaseMessageModal' }
</script>

<style lang="less" scoped>
.modal-title {
  font-weight: 600;
}

.msg-wrap {
  padding: 4px 4px 8px;
}

.msg-title {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  color: rgba(0, 0, 0, 0.88);
}

.msg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.msg-section {
  margin-bottom: 20px;
}

.section-label {
  position: relative;
  margin-bottom: 10px;
  padding-left: 10px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3px;
    bottom: 3px;
    width: 3px;
    border-radius: 2px;
    background: #1677ff;
  }
}

.msg-html {
  min-height: 120px;
  max-height: 52vh;
  overflow: auto;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.75);

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin: 12px 0 8px;
    color: #cf1322;
    font-weight: 700;
  }

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.4em;
    margin: 0 0 8px;
  }

  :deep(a) {
    color: #1677ff;
  }
}

.msg-actions {
  display: flex;
  justify-content: center;
  gap: 28px;
  padding-top: 8px;
}

.react-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 72px;
  height: 72px;
  border: 1px solid #f0f0f0;
  border-radius: 50%;
  background: #fff;
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  font-size: 12px;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;

  em {
    font-style: normal;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.35);
  }

  &:hover,
  &.active {
    border-color: #91caff;
    color: #1677ff;
    background: #f0f7ff;
  }
}
</style>
