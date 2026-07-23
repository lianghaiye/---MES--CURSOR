# I-DOMS 场景化实施文档包

面向售前、实施顾问。**V2.0** 按五场景重组。

## 交付物（推荐直接用）

| 类型      | 路径                                                                   | 用途                           |
| --------- | ---------------------------------------------------------------------- | ------------------------------ |
| **Word**  | [office/I-DOMS场景化实施手册.docx](./office/I-DOMS场景化实施手册.docx) | 主手册                         |
| **Word**  | [office/scene-cards/](./office/scene-cards/)                           | 五场景一页卡                   |
| **Word**  | [office/checklists/](./office/checklists/)                             | 实施勾选清单                   |
| **Excel** | [office/attachments/](./office/attachments/)                           | 字段采集与计薪确认（给客户填） |

源稿为 Markdown，改完后可重新导出。

## 五场景

| 编码 | 场景（对外）                                                                          |
| ---- | ------------------------------------------------------------------------------------- |
| 一   | 快速报工 + 工资核算                                                                   |
| 二   | 快速报工 + 工资核算 + 领料 + 成品入库                                                 |
| 三   | 任务报工 + 工资核算 + 领料 + 成品入库                                                 |
| 四   | 销售订单 + BOM 设计 + 计划排产 + 生产管理 + 任务报工 + 工资核算 + 库存管理 + 采购管理 |
| 五   | 场景四 + 质量管理                                                                     |

> 「库存扣减」不对客列为场景；实施在权限与功能参数中配置（见 `attachments/实施配置备忘-库存相关.md`）。

## 阅读顺序

1. 主手册 §3 四维诊断 → 选型
2. 对应场景章节（调研 / 功能 / 优势 / 路径 / 话术）
3. 场景卡片路演 → 检查清单落地 → Excel 采集

## 重新生成 Word / Excel

```bash
python3 -m venv .venv-docs   # 若尚无
.venv-docs/bin/pip install openpyxl python-docx
.venv-docs/bin/python docs/implementation/scripts/export_office.py
```

输出目录：`docs/implementation/office/`
