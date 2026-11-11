# 二手交易系统 · 实验二 软件设计与建模

校园二手交易系统的设计与建模成果（南京大学《软件工程》课程实验二）。

| 项 | 内容 |
|---|---|
| 课程 | 软件工程 |
| 实验 | 实验二 软件设计与建模 |
| 学号 / 姓名 | 241220143 / 王彦君 |
| 需求来源 | 实验一需求分析（35 条需求，REQ-001～REQ-035） |
| 技术栈 | Spring Boot 3 + MyBatis-Plus + MySQL 8；Vue 3（用户端 H5 + 管理端 Web） |

## 设计要点

系统把"发布 → 审核 → 预约 → 确认 → 完成"这条交易意向链固化成**有状态、有权限、可追溯**的数据，三条设计主线：

1. **状态机集中化**：商品 7 态、预约 7 态的合法转换由 `GoodsStateMachine` / `ReservationStateMachine`
   用转移表实现，非法转换直接拒绝且不改状态（REQ-005、REQ-030）。
2. **有效预约唯一靠数据库兜底**：`Goods.activeFlag` 为生成列，`UNIQUE(goods_id, active_flag)`
   保证同一商品最多一条有效预约；应用层再用 `SELECT ... FOR UPDATE` 先锁后判（REQ-012、REQ-020）。
3. **事务与日志分离**：预约与商品状态在同一事务内提交；操作日志走独立事务（`REQUIRES_NEW`），
   业务失败也留痕（REQ-017、REQ-020）。

## 目录结构

```
.
├── UML/          PlantUML 源码（.puml）与渲染结果（.png），11 张图
└── UI界面/        用户端 H5 与管理端 Web 的界面设计稿（13 屏）
```

### UML 图清单

| 类别 | 图 |
|---|---|
| 结构性 | 类图（领域实体）、类图（服务与状态机）、组件图、包图、部署图 |
| 行为性 | 用例图、活动图、状态图（商品）、状态图（预约） |
| 交互性 | 时序图（预约与并发）、时序图（取消与递补） |

## 重新渲染 UML 图

图由 [PlantUML](https://plantuml.com/zh/) 官方服务器渲染，无需安装 Java：

```bash
node tools/puml2png.mjs UML
```

（`tools/puml2png.mjs` 用 `zlib.deflateRaw + PlantUML 自定义 base64` 生成请求路径；
若离线，可把 `.puml` 源码粘到 plantuml.com 网页版导出。）

## 相关仓库

- 实验一（需求分析）：https://github.com/BlankBlacking/se-lab1-secondhand
