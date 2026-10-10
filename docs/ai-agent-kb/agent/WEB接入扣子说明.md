# 泵小智 · Web 接入扣子（Coze）说明

## 你的理解是否正确？

**是的。** 分工如下：

| 在哪做          | 做什么                                                        |
| --------------- | ------------------------------------------------------------- |
| **扣子**        | 人设、系统提示、欢迎语策略、知识库、工作流（已配好即可）      |
| **MES Web**     | 登录后嵌入的对话 UI（欢迎页样式、推荐问法、输入框、流式展示） |
| **agent-proxy** | 持有 `COZE_PAT`，把前端问题转发到扣子 `/v3/chat` 流式接口     |

MES **不需要**再抄一份人设进前端；欢迎区文案可以按产品视觉稿本地展示（与扣子欢迎语可一致），真正问答内容一律来自扣子。

---

## 本地启动

### 1. 配置代理密钥

```bash
cd agent-proxy
cp .env.example .env
# 编辑 .env：填入 COZE_PAT（bot_id 已默认写好）
```

### 2. 安装并启动代理

```bash
# 在 i-doms-web 根目录
npm run agent:proxy:install
npm run agent:proxy
# 默认 http://127.0.0.1:3100
```

健康检查：浏览器打开 `http://127.0.0.1:3100/health`

### 3. 启动前端

```bash
npm run serve
```

登录 MES 后，右下角出现 **泵小智** 悬浮按钮 → 打开绿色对话窗。

开发环境前端默认直连 `http://127.0.0.1:3100`（见 `src/api/agent.js`），不依赖 vue 代理是否生效。

**GitHub Pages 演示站**：Pages 无 Node，须另外部署 `agent-proxy`（如 Render），并把公网根地址写入仓库 Secret `VUE_APP_AGENT_BASE_URL`，见根目录 `DEPLOY.md`「演示站启用泵小智问答」。

自建生产环境可设 `VUE_APP_AGENT_BASE_URL=/agent-api`，并由 Nginx 反代到代理服务。

---

## 关键配置

| 变量            | 说明                                                            |
| --------------- | --------------------------------------------------------------- |
| `COZE_BOT_ID`   | `7694601564438396962`                                           |
| `COZE_API_BASE` | `https://api.coze.cn`                                           |
| `COZE_PAT`      | 个人访问令牌，仅服务端                                          |
| `REQUIRE_AUTH`  | `true` 时要求请求带 `Authorization: Bearer …`（MES 登录 token） |

---

## 多轮会话

前端保存扣子返回的 `conversationId`，下一问随请求带回；代理拼到  
`POST /v3/chat?conversation_id=...`，并设置 `auto_save_history: true`。

点面板「新对话」会清空本地 `conversationId` 与消息列表。

---

## 生产部署注意

1. **切勿**把 `COZE_PAT` 打进前端包。
2. 将 `agent-proxy` 部署到内网/同域网关后，由 Nginx 反代 `/agent-api`。
3. 正式环境建议用扣子 OAuth 应用密钥替代个人 PAT（按扣子文档迁移）。
4. 知识库更新在扣子侧完成，MES 无需发版。

---

## 代码位置

| 路径                                       | 作用                 |
| ------------------------------------------ | -------------------- |
| `agent-proxy/server.js`                    | 扣子流式代理         |
| `src/api/agent.js`                         | 前端 SSE 客户端      |
| `src/components/agent/BengXiaozhiChat.vue` | 悬浮窗 UI            |
| `src/layout/MainLayout.vue`                | 登录后主布局挂载入口 |
