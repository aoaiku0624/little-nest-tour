# 地点与道具内容包

以后增加地图内容只需要新增一个内容包，不再改规则引擎。

## 最短流程

1. 复制 `core/content/frontier-expansion.ts`，改成新的内容包。
2. 在包内填写 `places / routes / items / placeEventTriggerChances / routeEventTriggerChances`。
3. 在 `core/world.ts` 的 `CONTENT_PACKS` 末尾注册它。
4. 运行 `npm run test:content`；只有改了 `core/engine.ts`、`core/model.ts` 或结算契约时才需要运行 `npm test`。

## 自动拦截的问题

- 地点、路线、商店道具 id 重复。
- 路线连向不存在的地点，或地点完全没有路线。
- 地点/路线缺少昼夜触发率。
- 地点事件权重不等于 100，事件缺少持续时间或两种 AI 应对。
- 事件引用不存在的解除道具。
- 掉落次数、商店价格、路线距离与风险等数值无效。
- 地图坐标超出 0–100。

## 设计约定

- 城区、小镇及其延伸地点可以形成多连接枢纽。
- 林屋、山村、木屋的延伸地点以单线或少量支线为主，深处应提高发现价值与环境风险。
- 每个新地点默认配 5 类事件、3 个当地掉落和昼夜触发率；可购买道具放进 `items`，只作为当地掉落的道具放进 `itemPool` 即可。
- 新路线会自动成为旅行、连程和搬家的合法候选，不要另外写按钮。
