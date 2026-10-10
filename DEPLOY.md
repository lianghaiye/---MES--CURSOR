# 部署说明

演示地址：https://lianghaiye.github.io/---MES--CURSOR/

## Pages 设置（一次性）

1. 打开 https://github.com/lianghaiye/---MES--CURSOR/settings/pages
2. **Build and deployment → Source** 选择 **GitHub Actions**（不要选 Deploy from branch）

## 推送后自动部署

`main` 分支每次 push 会触发 **Deploy to GitHub Pages** 工作流，包含两步：

| 步骤   | 说明                                                  |
| ------ | ----------------------------------------------------- |
| build  | `npm ci` + `npm run build`，上传 `dist` 为 Pages 制品 |
| deploy | 将制品发布到 GitHub Pages                             |

## 手动重新部署

1. 打开 https://github.com/lianghaiye/---MES--CURSOR/actions
2. 左侧点 **Deploy to GitHub Pages**
3. 任选一种方式：

### 推荐：Run workflow（全新部署）

1. 右侧点 **Run workflow**
2. Branch 选 **main**
3. 点绿色 **Run workflow**

### 重跑某次记录

进入某次运行详情后，右上角必须点 **Re-run all jobs**（重跑全部作业）。

**不要点「Re-run failed jobs」**。只重跑 deploy 时 build 不会执行，deploy 会报错：

```
No artifacts named "github-pages" were found for this workflow run
```

## 部署成功标志

Actions 详情页两步均为绿色 ✓：

- build ✓
- deploy ✓

然后强刷演示站（Mac：`Cmd+Shift+R`，Windows：`Ctrl+Shift+R`）。

## 登录

- 账号：`admin`
- 密码：任意（Mock）

## 阿里云整站部署（推荐自建）

前端 + `agent-proxy` 都放同一台 ECS/轻量，不依赖 Pages 也能问答。  
步骤见 [`deploy/ALIYUN.md`](./deploy/ALIYUN.md)，Nginx 模板见 [`deploy/nginx-aliyun.conf`](./deploy/nginx-aliyun.conf)。

构建命令：`VUE_APP_PUBLIC_PATH=/ npm run build`。

---

## 演示站启用泵小智问答（必做一次）

GitHub Pages **只能托管前端**，不能跑 `agent-proxy`。要让  
https://lianghaiye.github.io/---MES--CURSOR/ 也能问答，需要：

### 1. 把代理部署到公网（推荐 Render 免费档）

1. 打开 [Render](https://render.com) 用 GitHub 登录
2. **New → Blueprint**，选本仓库，使用 `agent-proxy/render.yaml`  
   （或 **New → Web Service**，Root Directory 填 `agent-proxy`，Build `npm install`，Start `npm start`）
3. 在 Render 环境变量填入：
   - `COZE_PAT` = 扣子个人访问令牌（**不要**提交到 Git）
   - `COZE_BOT_ID` = `7694601564438396962`（Blueprint 已带）
   - `REQUIRE_AUTH` = `true`
4. 部署完成后记下服务地址，例如 `https://i-doms-agent-proxy.onrender.com`
5. 浏览器打开 `https://你的地址/health`，应看到 `"ok": true`、`"botConfigured": true`

免费档休眠后首次请求可能较慢，属正常。

### 2. 让 Pages 构建指向该代理

1. 打开仓库 **Settings → Secrets and variables → Actions**
2. 新建 Repository secret：
   - Name：`VUE_APP_AGENT_BASE_URL`
   - Value：上一步的代理根地址（**不要**末尾斜杠，**不要**带 `/api/...`）
3. 再 push `main`，或在 Actions 里 **Run workflow** 重新部署 Pages

未配置该 Secret 时，线上会请求 `/agent-api`，Pages 上会失败，本地开发不受影响。

### 3. 验证

1. 打开演示站并登录（`admin` / 任意密码）
2. 点右下角泵小智 → 提问

PAT 只放在 Render；前端只拿代理 URL，不会带出密钥。

---

## 本地开发

```bash
npm install
# 另开终端：配置 agent-proxy/.env 后
npm run agent:proxy
npm run serve
```

访问 http://localhost:8080
