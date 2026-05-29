import axios from 'axios'
import { message } from 'ant-design-vue'
import { getToken, setToken, clearAuth } from './auth'
import router from '@/router'

const request = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '/api',
  timeout: 30000,
})

let isRefreshing = false
let pendingQueue = []

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue = []
}

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 0 || res.code === 200) {
        return res.data !== undefined ? res.data : res
      }
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  async (error) => {
    const { response, config } = error
    if (!response) {
      message.error('网络异常，请检查连接')
      return Promise.reject(error)
    }

    const { status } = response

    if (status === 401 && config && !config._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((token) => {
          config.headers.Authorization = `Bearer ${token}`
          return request(config)
        })
      }

      config._retry = true
      isRefreshing = true

      try {
        const refreshRes = await axios.post(
          `${process.env.VUE_APP_API_BASE_URL || '/api'}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${getToken()}` } },
        )
        const newToken = refreshRes.data?.data?.token || refreshRes.data?.token
        if (newToken) {
          setToken(newToken)
          processQueue(null, newToken)
          config.headers.Authorization = `Bearer ${newToken}`
          return request(config)
        }
        throw new Error('refresh failed')
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuth()
        message.warning('登录已过期，请重新登录')
        router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    const msgMap = {
      403: '没有权限访问',
      404: '资源不存在',
      500: '服务器错误',
    }
    message.error(response.data?.message || msgMap[status] || `请求错误 (${status})`)
    return Promise.reject(error)
  },
)

export default request
