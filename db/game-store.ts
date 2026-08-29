import { env } from "cloudflare:workers";
import { createInitialState, migrateState } from "../core/engine";
import type { GameRecord, GameRepository } from "../core/agent-session";

const GAME_ID="main";
let initialized=false;

async function ensureStore(){
  if(initialized)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_records (
      id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      agent_status TEXT NOT NULL DEFAULT 'offline',
      active_session_id TEXT,
      agent_id TEXT,
      session_opened_at INTEGER,
      processed_requests_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL
    )`).run();
  await env.DB.prepare("PRAGMA optimize").run();
  initialized=true;
}

type Row={state_json:string;revision:number;agent_status:string;active_session_id:string|null;agent_id:string|null;session_opened_at:number|null;processed_requests_json:string;updated_at:number};
const fromRow=(row:Row):GameRecord=>({state:migrateState(JSON.parse(row.state_json),row.updated_at),revision:row.revision,agentStatus:row.agent_status==="online"?"online":"offline",activeSessionId:row.active_session_id,agentId:row.agent_id,sessionOpenedAt:row.session_opened_at,processedRequests:JSON.parse(row.processed_requests_json) as string[],updatedAt:row.updated_at});

export class D1GameRepository implements GameRepository {
  async load(){
    await ensureStore();
    let row=await env.DB.prepare("SELECT state_json, revision, agent_status, active_session_id, agent_id, session_opened_at, processed_requests_json, updated_at FROM game_records WHERE id = ?").bind(GAME_ID).first<Row>();
    if(!row){const now=Date.now();await env.DB.prepare("INSERT OR IGNORE INTO game_records (id, state_json, revision, agent_status, processed_requests_json, updated_at) VALUES (?, ?, 1, 'offline', '[]', ?)").bind(GAME_ID,JSON.stringify(createInitialState(now)),now).run();row=await env.DB.prepare("SELECT state_json, revision, agent_status, active_session_id, agent_id, session_opened_at, processed_requests_json, updated_at FROM game_records WHERE id = ?").bind(GAME_ID).first<Row>();}
    if(!row)throw new Error("无法初始化游戏存档");
    return fromRow(row);
  }
  async commit(next:GameRecord,expectedRevision:number){
    await ensureStore();
    const result=await env.DB.prepare("UPDATE game_records SET state_json = ?, revision = ?, agent_status = ?, active_session_id = ?, agent_id = ?, session_opened_at = ?, processed_requests_json = ?, updated_at = ? WHERE id = ? AND revision = ?").bind(JSON.stringify(next.state),next.revision,next.agentStatus,next.activeSessionId,next.agentId,next.sessionOpenedAt,JSON.stringify(next.processedRequests),next.updatedAt,GAME_ID,expectedRevision).run();
    return Number(result.meta.changes??0)===1;
  }
}
