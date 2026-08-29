# 外部 Agent 玩家协议

《小窝巡游》不内置玩家模型：游戏程序是裁判与存档，独立运行的 agent 才是饲养者玩家。

## 一轮的生命周期

1. `open` 上线：新存档首次上线可同时提交 `playerName` 与 `petName`，随后名字锁定；若上轮留有安排，程序先结算，再返回已揭晓事实。
2. agent 读取 `state`、`rules`、`world`、`recentPublicFacts`、`privateJournal` 和 `legalActions`。
3. agent 可连续提交多个动作，每步都用最新 `revision` 并重新从 `legalActions` 选择。
4. agent 可追加或修订私人饲养日记。
5. `close` 主动下线：不结算当轮动作；只有下次 `open` 才揭晓后果。

agent 不能直接修改宠物数值、金钱、掉落、随机事件或公开日志。

## MCP（推荐给 Codex / Claude Desktop 等）

先在一个终端启动游戏：

```bash
npm run dev
```

再把这个本地 MCP 命令加入你的 agent 配置：

```json
{
  "mcpServers": {
    "little-nest": {
      "command": "node",
      "args": ["/absolute/path/to/little-nest/agent/mcp-server.mjs"],
      "env": { "LITTLE_NEST_URL": "http://localhost:3000" }
    }
  }
}
```

MCP 进程与游戏都在玩家自己的电脑上，不需要项目作者提供公网服务器；它向 agent 提供五个工具：`little_nest_open_session`、`little_nest_read_state`、`little_nest_choose_action`、`little_nest_write_journal` 和 `little_nest_close_session`。

## 本地 HTTP

| 目的 | 方法与路径 |
| --- | --- |
| 公开观察快照 | `GET /api/game` |
| 上线 / 下线 | `POST /api/agent/session` |
| 读取 agent 快照 | `GET /api/agent/session?sessionId=...` |
| 安排动作 | `POST /api/agent/action` |
| 追加 / 修订私人日记 | `POST /api/agent/journal` |

每次写操作都必须带唯一 `requestId`；重试同一请求时复用它，程序不会重复执行。除首次上线外，写操作还需要最新 `expectedRevision`；`409` 表示会话或版本过期，重读状态后再判断；`422` 表示动作不合法。会话超过 30 分钟会自动失效，新 agent 可重新上线并继续。

首次 `open` 示例字段：`{"agentId":"local-player","playerName":"旅行家","petName":"小团子"}`。偏僻地点可掉落专属互动收藏，情书模板会使用这两个名字并保存在 `state.keepsakes`，普通道具仍进入 `state.inventory`。

如果在 `.env.local` 配置了 `AGENT_TOKEN`，HTTP 请求需带 `Authorization: Bearer <token>`，MCP 进程则设置同值的 `LITTLE_NEST_AGENT_TOKEN`。

## 独立玩家示例

```bash
npm run example:agent
```

该脚本是一个与网页、规则引擎分离的 HTTP 客户端：它会自行上线、读取、写日记、安排最多两项动作、下线，直到完成一次往返旅行。
