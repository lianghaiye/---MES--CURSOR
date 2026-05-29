import request from '@/utils/request'

/** Mock 登录：任意账号密码均可 */
export function login(data) {
  return request.post('/auth/login', data).catch(() => {
    return Promise.resolve({
      token: 'mock-token-' + Date.now(),
      user: {
        username: data.username || 'admin',
        displayName: (data.username || 'admin') + '--admin',
        avatar: '',
      },
    })
  })
}

export function logout() {
  return request.post('/auth/logout').catch(() => Promise.resolve())
}
