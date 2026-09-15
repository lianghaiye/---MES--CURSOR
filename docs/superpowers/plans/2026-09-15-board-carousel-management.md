# 看板轮播管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 i-doms-web「看板管理」下交付看板列表台账与多套轮播方案管理，并提供独立播放页（预览/全屏/分享链接）。

**Architecture:** localStorage store 持久化台账与方案；管理页 CRUD；播放页 iframe + 切屏动效按方案配置轮播。系统内看板经台账 `playPath` 引用，外部 URL 仅作条目来源。

**Tech Stack:** Vue 3 + Ant Design Vue + Vue Router + localStorage（与现有 store 模式一致）

## Global Constraints

- 仅改 `i-doms-web`；不改小程序、不改工单监管取数逻辑
- 不做物理删除看板；不做后端 API
- 切屏：`cut` / `fade` / `slide`；一轮后：`loop` / `stop`
- 条目排序：上下移（无拖拽库）
- Spec: `docs/superpowers/specs/2026-09-15-board-carousel-management-design.md`

---

### Task 1: Store — 看板台账 + 轮播方案

**Files:**

- Create: `src/mock/boardCatalogSeed.js`
- Create: `src/store/boardCatalogStore.js`
- Create: `src/store/boardCarouselStore.js`

- [ ] **Step 1: 台账种子与 store**

种子一条工单监管；API：`listBoardCatalog`、`getBoardCatalogById`、`saveBoardCatalog`、`setBoardCatalogEnabled`、`getEnabledBoardOptions`。编码唯一校验。

- [ ] **Step 2: 轮播 store**

API：`listCarouselSchemes`、`getCarouselSchemeById`、`saveCarouselScheme`、`duplicateCarouselScheme`、`setCarouselSchemeEnabled`、`buildCarouselPlayUrl(schemeId)`、`resolvePlayableItems(scheme)`（跳过停用看板/空 URL）。默认停留 15；校验名称非空、≥1 有效条目、http(s)。

- [ ] **Step 3: Commit** `feat: 看板台账与轮播方案 store`

---

### Task 2: 菜单与路由

**Files:**

- Modify: `src/config/menus.js`
- Modify: `src/router/index.js`

- [ ] **Step 1:** `sideMenus.board` 顺序：看板列表 → 轮播管理 → 工单监管看板（使 `/board` 默认进 catalog）
- [ ] **Step 2:** 子路由 `board/catalog`、`board/carousel`；standalone ` /board/carousel/play/:schemeId`
- [ ] **Step 3:** `routeTitleMap` 补齐标题
- [ ] **Step 4: Commit** `feat: 挂载看板列表与轮播管理路由菜单`

---

### Task 3: 看板列表页

**Files:**

- Create: `src/views/board/BoardCatalogView.vue`
- Create: `src/views/board/components/BoardCatalogModal.vue`

- [ ] **Step 1:** 列表 + 新建/编辑 Modal（编码创建后只读）+ 启用/停用
- [ ] **Step 2: Commit** `feat: 看板列表台账管理页`

---

### Task 4: 轮播管理列表 + 编辑抽屉

**Files:**

- Create: `src/views/board/BoardCarouselListView.vue`
- Create: `src/views/board/components/BoardCarouselSchemeDrawer.vue`

- [ ] **Step 1:** 方案列表：新建/编辑/复制/启停/预览/复制链接/全屏播放
- [ ] **Step 2:** 抽屉：基本信息 + 条目（来源 board/url、上下移、停留覆盖）
- [ ] **Step 3: Commit** `feat: 轮播方案列表与编辑抽屉`

---

### Task 5: 独立播放页

**Files:**

- Create: `src/views/board/BoardCarouselPlayView.vue`

- [ ] **Step 1:** 加载方案；无效/停用提示；iframe 轮播；cut/fade/slide；暂停/上下页；loop/stop；不可嵌入占位；`?fullscreen=1` 尝试全屏
- [ ] **Step 2: Commit** `feat: 看板轮播独立播放页`

---

### Task 6: 冒烟验收

- [ ] 菜单可见；台账种子存在；建方案含系统看板+外部 URL；预览可切屏；停用看板被跳过
- [ ] 更新 design spec 状态为已实施（可选一行）
