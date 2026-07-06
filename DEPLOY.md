# 部署说明

演示地址：https://lianghaiye.github.io/---MES--CURSOR/

## Pages 设置（一次性）

1. 打开 https://github.com/lianghaiye/---MES--CURSOR/settings/pages
2. **Build and deployment → Source** 选择 **GitHub Actions**（不要选 Deploy from branch）

## 推送后自动部署

`main` 分支每次 push 会触发 **Deploy to GitHub Pages** 工作流，包含两步：

| 步骤 | 说明 |
|------|------|
| build | `npm ci` + `npm run build`，上传 `dist` 为 Pages 制品 |
| deploy | 将制品发布到 GitHub Pages |

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

## 本地开发

```bash
npm install
npm run serve
```

访问 http://localhost:8080
