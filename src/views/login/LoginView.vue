<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">I-DOMS</h1>
      <p class="subtitle">制造执行管理系统</p>
      <a-form :model="form" layout="vertical" @finish="onSubmit">
        <a-form-item
          label="用户名"
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input v-model:value="form.username" size="large" placeholder="admin" />
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="form.password"
            size="large"
            placeholder="任意密码（Mock）"
          />
        </a-form-item>
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">
          登录
        </a-button>
      </a-form>
      <p v-if="buildLabel" class="build-label">{{ buildLabel }}</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { setToken, setUser } from '@/utils/auth'
import { resolveUserDefaultWorkshop } from '@/constants/workshopDirector'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const buildLabel = process.env.VUE_APP_BUILD_SHA
  ? `Build ${String(process.env.VUE_APP_BUILD_SHA).slice(0, 7)}`
  : ''

const form = reactive({
  username: 'admin',
  password: '123456',
})

async function onSubmit() {
  loading.value = true
  try {
    const token = 'mock-token-' + Date.now()
    const user = {
      username: form.username,
      displayName: `${form.username}--admin`,
      defaultWorkshop: resolveUserDefaultWorkshop({ username: form.username }),
    }
    setToken(token)
    setUser(user)
    message.success('登录成功')
    const redirect = route.query.redirect || '/home/dashboard'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="less" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f2f5 50%, #fff 100%);
}

.login-card {
  width: 400px;
  max-width: 92vw;
  padding: 40px 36px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.title {
  text-align: center;
  color: #1677ff;
  font-size: 28px;
  margin: 0 0 4px;
}

.subtitle {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 32px;
}

.build-label {
  margin: 16px 0 0;
  text-align: center;
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
}
</style>
