# Agent 检索与切片建议

供搭建 RAG / 知识库导入时使用。

## 1. 建议元数据字段

| 字段      | 示例                                       | 用途                     |
| --------- | ------------------------------------------ | ------------------------ |
| doc_type  | manual / faq / error / process / reference | 路由意图                 |
| module    | report / inventory / sales / qc / ...      | 模块过滤                 |
| audience  | customer / implementer / admin             | 角色过滤                 |
| scene     | S1～S5 / all                               | 场景过滤                 |
| menu_path | 系统管理/功能参数/工资推送                 | 回答引用                 |
| keywords  | 工资推送,salaryPushMode,手动推送           | 关键词召回               |
| priority  | 1～5                                       | 冲突时权重（实施手册=5） |

## 2. 切片策略

| 文档类型  | 切片单位                | 备注                 |
| --------- | ----------------------- | -------------------- |
| manuals   | 二级标题（##）一块      | 保留菜单路径句       |
| faq       | 每个问题（###）一块     | question 作标题向量  |
| errors    | 每个报错条目一块        | **原文**作主检索键   |
| processes | 整篇 + 验收用例表单独片 | 流程图可另存描述文本 |
| reference | 按表格/参数项切片       | 参数值枚举整表保留   |

重叠：相邻块 1 段 overlap，避免表格被拦腰切断。

## 3. 意图路由伪规则

```
if 用户消息含报错引号或「提示」「失败」 → errors 优先
elif 含「怎么」「如何」「步骤」 → manuals
elif 含「为什么」「能不能」「是不是」 → faq
elif 含「流程」「从…到…」 → processes
elif 含「配置」「参数」「模式」 → reference/01
elif 含「场景」「选型」「实施」 → processes/P06 + faq实施
else 混合检索 topK，reference/00 保底
```

## 4. 回答护栏（写入 System Prompt 建议）

1. 必须给出菜单路径或明确「需管理员在功能参数配置」。
2. 库存扣减：对客户用业务语言；对实施可讲参数名。
3. 不承诺占位模块（售后、完整 WMS/QMS 等）为已上线。
4. 质检强管控、LIFO 等标注「当期可能未开放」。
5. 打印客户端按日志/目录/MQTT 识别，不混用 OMS/MES/I-DOMS。
6. 答案与现场版本冲突时，以现场功能参数与后端为准，并建议核实版本号。

## 5. 与既有文档去重

导入本库即可覆盖 Agent 主知识；以下作为 **高优先级补充** 而非重复全文：

- `docs/implementation/I-DOMS场景化实施手册.md`
- `docs/implementation/attachments/计薪口径确认表.md`
- `docs/implementation/attachments/实施配置备忘-库存相关.md`
- 关键云效需求（入库状态机、五类质检、MTS 占用等）

设计稿 `superpowers/specs/` 默认 **不** 全量导入生产 Agent（易含未上线设计）；仅在「研发答疑」空间导入。
