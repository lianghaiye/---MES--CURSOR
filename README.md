# I-DOMS Web

I-DOMS 制造执行系统（MES）前端框架：Vue 3 + Webpack（Vue CLI）+ Ant Design Vue。

- **在线预览**：[https://lianghaiye.github.io/---MES--CURSOR/](https://lianghaiye.github.io/---MES--CURSOR/)
- **代码仓库**：[https://github.com/lianghaiye/---MES--CURSOR](https://github.com/lianghaiye/---MES--CURSOR)

## 技术栈

| 项 | 选型 |
| --- | --- |
| 框架 | Vue 3（JavaScript） |
| 构建 | Webpack（`@vue/cli-service`） |
| UI | Ant Design Vue 4 |
| 路由 | Vue Router 4 |
| HTTP | Axios（含 Token 注入与 401 刷新占位） |
| 数据 | 本地 Mock（`src/mock`） |

## 功能概览

- 顶栏全部一级模块可点击，跳转对应占位页
- 「更多」菜单：WMS、QMS、设备管理、报表中心等扩展入口
- 左侧二级菜单随顶栏模块切换
- **全局多页签**：可关闭、切换（首页不可关闭）
- Mock 登录（任意账号密码）
- **计划排产 → 生产计划**：主从布局 + 本地筛选（对齐截图结构）
- 其余模块为占位页，便于后续扩展

## 环境要求

- Node.js **18+** 或 **20 LTS**（推荐 20）
- npm 9+（已随 Node 安装）

## 快速开始

```bash
cd i-doms-web
npm install
npm run serve
```

浏览器访问：<http://localhost:8080>

默认账号：`admin` / 任意密码

## 常用命令

```bash
npm run serve    # 开发
npm run build    # 生产构建（输出 dist/）
npm run lint     # ESLint 检查并自动修复
npm run format   # Prettier 格式化
```

## 目录结构

```
src/
├── api/           # 接口定义（对接后端时扩展）
├── composables/   # 组合式逻辑（如全局页签）
├── config/        # 菜单与路由标题配置
├── layout/        # 顶栏、侧栏、页签、主布局
├── mock/          # 本地 Mock 数据
├── router/        # 路由与登录守卫
├── styles/        # 全局样式
├── utils/         # axios 封装、鉴权工具
└── views/         # 页面
    ├── login/
    ├── planning/  # 生产计划（已实现主从页）
    └── placeholder/
```

## 对接后端

1. 在 `.env.production` 中设置 `VUE_APP_API_BASE_URL`
2. 在 `vue.config.js` 的 `devServer.proxy` 中配置代理（按需）
3. 将 `src/mock` 替换为 `src/api` 真实请求

统一响应约定（`src/utils/request.js`）：

```json
{ "code": 0, "data": {}, "message": "ok" }
```

## 发布到 GitHub

```bash
git init
git add .
git commit -m "feat: I-DOMS MES 前端框架初始化"
git remote add origin <你的仓库地址>
git push -u origin main
```

## 后续建议扩展

1. **生产管理 → 工单管理**、**销售管理 → 销售订单**
2. 将页签状态迁入 Pinia（多组件共享时）
3. 按模块拆分 `views/` 与懒加载 chunk

## 包管理器说明

| 工具 | 特点 |
| --- | --- |
| **npm** | Node 自带，生态最广，适合开源仓库 |
| **pnpm** | 安装快、省磁盘，适合 monorepo |
| **yarn** | 经典替代方案 |

本项目默认使用 **npm**。
