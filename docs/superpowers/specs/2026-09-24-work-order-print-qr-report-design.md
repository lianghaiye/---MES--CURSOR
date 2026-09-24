# 工单打印二维码 · 扫码报工设计

**日期：** 2026-09-24  
**仓库：** `i-doms-web`（打印）+ `i-doms-mobile`（微信小程序报工）  
**状态：** 一期已实现（演示 token；正式需换服务端签名 + 小程序码）  
**关联：** 工序报工 / 任务领取（`pages/process-report/*`）；打印入口 `WorkOrderPrintModal`

---

## 1. 目标

工人扫纸质工单上的二维码，进入小程序完成**查看 / 领取 / 报工**（规则与现网一致，不新开一套计价逻辑）。

打印前可配置：

- 是否打印二维码
- 粒度：整单一码 / 每工序一码 / 两种都打

---

## 2. 已拍板规则

| #   | 决策                                                                                                |
| --- | --------------------------------------------------------------------------------------------------- |
| 1   | 工单级 + 工序任务级都要，**打印前可选**                                                             |
| 2   | 落地端：**微信小程序**（`i-doms-mobile`）                                                           |
| 3   | **必须登录**（工号/账号绑定）                                                                       |
| 4   | **未领取不能报工**：进任务详情，提示领取                                                            |
| 5   | 码本身不因时间「烂掉」；**工单关闭后 7 天内仍可打开看状态，超过则链接失效**；已报工则展示已报工状态 |
| 6   | 一码多序 + 每序一码都要，与粒度配置合并                                                             |

---

## 3. 打印前配置（Web）

落在现有「打印工单」弹窗（`WorkOrderPrintModal`），当次生效；可用 `localStorage` 记住上次选择。

```
□ 打印报工二维码

粒度（勾选打印后出现）：
  ○ 整单一个     → 页眉/封面一块大码；扫完进工单任务列表
  ○ 每工序一个   → 各工序行旁一块码；扫完进该工序任务
  ○ 两种都打     → 以上都有

（可选，二期）工序范围：全部已下发工序 / 仅勾选工序
```

**批量打印：** 每张工单各自按同一套选项生成码。

**预览 payload 扩展（示意）：**

```js
printOptions: {
  paper, orientation, printContent,
  qrEnabled: boolean,
  qrMode: 'order' | 'process' | 'both',  // 仅 qrEnabled 时有效
}
// sheets[].qrOrder?: { token, tip }
// sheets[].processes[].qr?: { token, tip }  // qrMode 含 process/both
```

纸面旁注：工单号、（工序码时）工序名，便于扫不出时人工核对。

---

## 4. Token 约定

### 4.1 原则

- 二维码内容优先：**小程序码**（`scene` 短参）或 **URL Link / 明文 path+query**（开发期可用）
- **业务主键放服务端可校验的 token**，勿仅依赖前端藏 id
- 打印时生成（或复用未过期 token）；同一 `workOrderId + processTaskId` 可复用同一 token，便于重打

### 4.2 Payload（加密/签名前）

```ts
{
  v: 1,
  scope: 'order' | 'process',   // 整单 | 工序任务
  workOrderId: string,
  processTaskId?: string,       // scope=process 必填
  iat: number,                  // 签发时间 unix
  // 不在 token 里写「失效时刻」；失效规则见下，由服务端按工单状态算
}
```

签发：HMAC/JWT（密钥仅服务端）。演示期可先 `base64url(JSON)` + 本地校验，上线前换真签名。

### 4.3 失效与只读（服务端判定）

| 条件                                  | 打开页                   | 能否报工               |
| ------------------------------------- | ------------------------ | ---------------------- |
| token 签名非法                        | 失效页                   | 否                     |
| 工单不存在                            | 失效页                   | 否                     |
| 工单已关闭，且 `now > closedAt + 7天` | 「链接已失效」           | 否                     |
| 工单已关闭，但仍在 7 天内             | 详情只读                 | 否（除非业务另开例外） |
| 工单进行中，任务未领取                | 任务详情                 | 否；提示领取           |
| 已领取且可报                          | 报工页或详情可点报工     | 是                     |
| 已报完 / 不可再报                     | 详情只读，展示已报工状态 | 否                     |

说明：「码不失效」= 关闭后 7 天内仍可扫开看状态；**超过 7 天不可打开业务页**。

---

## 5. 小程序路由与跳转

复用现有页面，少造轮子：

| 场景               | 建议落地                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| 登录               | `pages/login/index`，回跳带回 `token` / `scene`                                                              |
| 整单码             | 工单下工序任务列表（可新建 `pages/process-report/wo-tasks`，或扩展 `process-report/index` 带 `workOrderId`） |
| 工序码 · 未领取    | `pages/process-report/claim-detail`（提示领取）                                                              |
| 工序码 · 可报      | `pages/process-report/execute`（现有填写报工；分项走任务报工，不走快速报工）                                 |
| 工序码 · 已报/只读 | `claim-detail` 或 `record-detail` 展示状态                                                                   |
| token 失效         | 简单结果页文案即可                                                                                           |

### 5.1 扫码入口

1. 小程序码：`onLaunch` / `onShow` 解析 `scene` → 换 token 详情
2. 普通二维码（若用 URL）：中间页解析 query → `reLaunch` 到上述页面

统一中转页建议：`pages/process-report/scan-entry`

```
scan-entry?token=...
  → 未登录 → login → 回跳
  → GET /api/work-order-qr/resolve?token=
  → 按返回的 landType 跳转
```

### 5.2 resolve 接口返回（示意）

```ts
{
  ok: true,
  landType: 'wo_task_list' | 'claim_detail' | 'execute' | 'readonly' | 'expired',
  workOrderId, processTaskId?,
  claimStatus, reportStatus,
  message?: string,  // 如「请先领取后再报工」
}
```

客户端**不要自己猜**能否报工，一律听 resolve。

---

## 6. 与现网规则对齐（必守）

- 领取、执行人、协作报工、非时序/选做等：**与 PC/小程序现有报工一致**
- 分项报工口径：扫码只进**任务报工**（`execute`），不进快速报工
- 权限：非本任务可领/可看范围外的用户，resolve 返回无权限文案

---

## 7. 分期

### 一期（建议）

1. 打印弹窗：二维码开关 + 粒度三选一
2. 预览/打印渲染整单码、工序码（微信小程序码或开发用 path 码）
3. 小程序 `scan-entry` + resolve（含关闭后 7 天、未领取提示）
4. 跳转复用 `claim-detail` / `execute`

### 二期

- 打印时勾选工序范围
- 码与标签机小标签
- 企业微信/其它端
- token 轮换、审计报表（扫码报工占比）

---

## 8. 涉及文件（实现时）

| 端     | 路径                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| Web    | `WorkOrderPrintModal.vue`、`workOrderPrintPreview.js`、`WorkOrderPrintPreviewView.vue` |
| Web    | 新建 `utils/workOrderQrToken.js`（演示签发）或接后端签发 API                           |
| Mobile | `pages/process-report/scan-entry`、复用 `claim-detail` / `execute`；`pages.json` 注册  |
| Mobile | 登录回跳带 token                                                                       |

---

## 9. 验收要点

1. 打印前可选：不打码 / 整单 / 每序 / 两种都打，预览可见。
2. 未登录扫码 → 登录 → 回到正确落地页。
3. 未领取工序码 → 详情 + 领取提示，不能直接提交报工。
4. 已领取可报 → 进入填写报工并成功提交。
5. 已报工 → 只读展示已报状态。
6. 工单关闭未满 7 天 → 可打开只读；满 7 天 → 失效页。
7. 分项任务扫码不进入快速报工。
