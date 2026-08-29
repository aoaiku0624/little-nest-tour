import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_SESSION_TTL_MS, AgentApiError, AgentSessionService, type GameRecord, type GameRepository } from "./agent-session";
import { createInitialState } from "./engine";

class MemoryRepository implements GameRepository {
  constructor(public record:GameRecord={state:createInitialState(1),revision:1,agentStatus:"offline",activeSessionId:null,agentId:null,sessionOpenedAt:null,processedRequests:[],updatedAt:1}){}
  async load(){return structuredClone(this.record);}
  async commit(next:GameRecord,expectedRevision:number){if(this.record.revision!==expectedRevision)return false;this.record=structuredClone(next);return true;}
}
const decision=(actionKey:string,note="独立玩家决定")=>({actionKey,reasonCode:"explore" as const,note,continueSession:false});

test("观察窗不暴露私人日记，玩家首次上线可命名双方且之后不能覆盖",async()=>{const repository=new MemoryRepository();const service=new AgentSessionService(repository,()=>10);const observer=await service.observe();assert.equal("caretakerJournal" in observer.state,false);const online=await service.open({agentId:"codex-local",playerName:"老公",petName:"乖乖",requestId:"open-1",expectedRevision:1});assert.equal(online.session.status,"online");assert.equal(online.session.agentId,"codex-local");assert.equal(online.state.playerName,"老公");assert.equal(online.state.petName,"乖乖");assert.equal(online.state.identityConfigured,true);assert.ok(online.privateJournal.length>0);assert.ok(online.legalActions.some(action=>action.key==="choose_home:station"));const closed=await service.close({sessionId:online.session.id!,requestId:"close",expectedRevision:online.revision});const reopened=await service.open({agentId:"codex-local",playerName:"别人",petName:"别的小宠物",requestId:"open-2",expectedRevision:closed.revision});assert.equal(reopened.state.playerName,"老公");assert.equal(reopened.state.petName,"乖乖");});

test("会话版本、幂等和非法动作均由系统强制",async()=>{const repository=new MemoryRepository();const service=new AgentSessionService(repository,()=>20);const online=await service.open({agentId:"agent",requestId:"open",expectedRevision:1});await assert.rejects(()=>service.act({sessionId:online.session.id!,requestId:"bad",expectedRevision:online.revision,decision:decision("set_money:999")}),error=>error instanceof AgentApiError&&error.status===422);const acted=await service.act({sessionId:online.session.id!,requestId:"act-1",expectedRevision:online.revision,decision:decision("choose_home:station")});assert.equal(acted.state.pendingActions.length,1);const replay=await service.act({sessionId:online.session.id!,requestId:"act-1",expectedRevision:online.revision,decision:decision("choose_home:station")});assert.equal(replay.state.pendingActions.length,1);await assert.rejects(()=>service.act({sessionId:online.session.id!,requestId:"stale",expectedRevision:online.revision,decision:decision("choose_home:hill")}),error=>error instanceof AgentApiError&&error.status===409);});

test("同轮多动作只安排，下线不结算，下次上线才揭晓",async()=>{const repository=new MemoryRepository();let now=100;const service=new AgentSessionService(repository,()=>++now);let online=await service.open({agentId:"agent",requestId:"open-1",expectedRevision:1});const publicCount=online.state.publicLog.length;online=await service.act({sessionId:online.session.id!,requestId:"home",expectedRevision:online.revision,decision:decision("choose_home:station")});const closed=await service.close({sessionId:online.session.id!,requestId:"close-1",expectedRevision:online.revision});assert.equal(closed.state.homeId,null);assert.equal(closed.state.publicLog.length,publicCount);const next=await service.open({agentId:"agent",requestId:"open-2",expectedRevision:closed.revision});assert.equal(next.state.homeId,"station");assert.equal(next.state.clock.turn,2);assert.ok(next.state.publicLog.length>publicCount);});

test("外部 agent 可追加和修订私人日记，不会篡改公开事实",async()=>{const repository=new MemoryRepository();const service=new AgentSessionService(repository,()=>200);let online=await service.open({agentId:"agent",requestId:"open",expectedRevision:1});const facts=online.state.publicLog.length;online=await service.journal({sessionId:online.session.id!,requestId:"journal-1",expectedRevision:online.revision,revision:{observation:"还没有家",hypothesis:"交通重要",goal:"先安顿",plan:"比较住址",outcome:"待验证"}});const entry=online.privateJournal[0];assert.equal(online.state.publicLog.length,facts);online=await service.journal({sessionId:online.session.id!,requestId:"journal-2",expectedRevision:online.revision,entryId:entry.id,revision:{observation:"仍未安顿",hypothesis:"站郊稳妥",goal:"选站郊",plan:"下一步选址",outcome:"修正旧判断"}});assert.equal(online.privateJournal.find(item=>item.id===entry.id)?.revisions.length,2);assert.equal(online.state.publicLog.length,facts);});

test("空闲上线不推进回合；旅程进行中则无条件推进一轮",async()=>{
  const repository=new MemoryRepository();let now=100;const service=new AgentSessionService(repository,()=>++now);
  const first=await service.open({agentId:"agent",requestId:"open-1",expectedRevision:1});
  assert.equal(first.state.clock.turn,1);
  const closed=await service.close({sessionId:first.session.id!,requestId:"close-1",expectedRevision:first.revision});
  const peek=await service.open({agentId:"agent",requestId:"open-2",expectedRevision:closed.revision});
  assert.equal(peek.state.clock.turn,1,"上轮无安排时，空闲上线不应推进回合");
  const journeyState=createInitialState(1);journeyState.homeId="station";journeyState.positionId=null;journeyState.currentRouteId="hill-station";journeyState.activeJourney={id:"journey",routeId:"hill-station",destinationId:"station",startedTurn:1,stage:"outbound",remainingTurns:1,overnightCount:0,incidentRiskMultiplier:1,moments:[]};
  const repo2=new MemoryRepository({state:journeyState,revision:1,agentStatus:"offline",activeSessionId:null,agentId:null,sessionOpenedAt:null,processedRequests:[],updatedAt:1});
  const service2=new AgentSessionService(repo2,()=>now+=40);
  const journeyOpen=await service2.open({agentId:"agent",requestId:"open-j",expectedRevision:1});
  assert.equal(journeyOpen.state.clock.turn,2,"旅程中即使无任何安排，上线也应推进一轮");
  assert.equal(journeyOpen.state.activeJourney?.stage,"play","去程完毕后应进入游玩阶段");
});

test("搬家：只能搬到交通直达地点，费用为新房费的 2 倍，不重置属性",async()=>{
  let now=100;
  const seat=(money:number)=>{const state=createInitialState(1);state.homeId="hill";state.positionId="hill";state.money=money;return new MemoryRepository({state,revision:1,agentStatus:"offline",activeSessionId:null,agentId:null,sessionOpenedAt:null,processedRequests:[],updatedAt:1});};
  const service=new AgentSessionService(seat(200),()=>++now);
  const online=await service.open({agentId:"agent",requestId:"open-1",expectedRevision:1});
  const station=online.legalActions.find(a=>a.key==="move_home:station");
  assert.ok(station,"住在风铃山村时应有搬到银杏站郊的选项");
  assert.equal(station?.cost,90,"搬家费应为新房费(45)的两倍");
  assert.ok(!online.legalActions.some(a=>a.key.startsWith("move_home:lake")),"风铃山村没有直达月湖的路线，不应允许直接搬过去");
  const acted=await service.act({sessionId:online.session.id!,requestId:"move",expectedRevision:online.revision,decision:decision("move_home:station","搬到枢纽，解锁更多路线")});
  const closed=await service.close({sessionId:online.session.id!,requestId:"close-1",expectedRevision:acted.revision});
  const next=await service.open({agentId:"agent",requestId:"open-2",expectedRevision:closed.revision});
  assert.equal(next.state.homeId,"station");
  assert.equal(next.state.positionId,"station");
  const moveRow=next.state.ledger.find(e=>e.category==="住房"&&e.note.startsWith("搬家至"));
  assert.ok(moveRow,"账本应记录搬家支出");
  assert.equal(moveRow.amount,-90,"搬家费为新房费的 2 倍");
  assert.ok(next.state.money>=118,"扣掉搬家费 90 后叠加本轮保底收入 8（结算还会计入当地事件收益，只做下界校验）");
  const poor=new AgentSessionService(seat(80),()=>now+=17);
  const broke=await poor.open({agentId:"agent",requestId:"open-poor",expectedRevision:1});
  assert.ok(!broke.legalActions.some(a=>a.key==="move_home:station"),"低于搬家费时不应提供搬家选项");
});

test("连程旅行：游玩阶段可续行转场，预算与用品分别列支，直接转往下一站", async () => {
  let now = 200;
  const seed = (money: number, kit: number, stage: "outbound" | "return") => {
    const state = createInitialState(1);
    state.homeId = "station";
    state.positionId = null;
    state.money = money;
    state.stats = { ...state.stats, energy: 90 };
    state.inventory = [{ id: "trip-kit", name: "旅行用品包", kind: "trip", usesRemaining: kit, maxUses: 4 }];
    state.activeJourney = { id: "journey", routeId: "station-lake", destinationId: "lake", startedTurn: 1, stage, remainingTurns: 1, overnightCount: 0, incidentRiskMultiplier: 1, moments: [] };
    return new MemoryRepository({ state, revision: 1, agentStatus: "offline", activeSessionId: null, agentId: null, sessionOpenedAt: null, processedRequests: [], updatedAt: 1 });
  };
  const service = new AgentSessionService(seed(200, 3, "outbound"), () => ++now);
  const online = await service.open({ agentId: "agent", requestId: "open-1", expectedRevision: 1 });
  const cont = online.legalActions.find((a) => a.key === "continue_trip:lake-coast");
  assert.ok(cont, "在月湖游玩阶段应可续行前往潮汐小镇（直达路线）");
  assert.equal(cont?.cost, 37, "lake→coast 预算 = (14+9+8)×站郊倍率0.8舍入25 + 应急金12 = 37");
  const acted = await service.act({ sessionId: online.session.id!, requestId: "cont", expectedRevision: online.revision, decision: decision("continue_trip:lake-coast", "转场去海边") });
  const closed = await service.close({ sessionId: online.session.id!, requestId: "close-1", expectedRevision: acted.revision });
  const next = await service.open({ agentId: "agent", requestId: "open-2", expectedRevision: closed.revision });
  assert.equal(next.state.activeJourney?.destinationId, "coast", "转场后目的地变为潮汐小镇");
  assert.equal(next.state.activeJourney?.stage, "outbound", "进入下一段去程");
  assert.equal(next.state.activeJourney?.routeId, "lake-coast");
  assert.equal(next.state.inventory.find((i) => i.id === "trip-kit")?.usesRemaining, 2, "转场消耗 1 次旅行用品");
  assert.ok(next.state.ledger.some((e) => e.category === "旅行" && e.note.includes("转场") && e.amount === -37), "转场费用单独入账");
  const ended = new AgentSessionService(seed(200, 3, "return"), () => (now += 13));
  const back = await ended.open({ agentId: "agent", requestId: "open-3", expectedRevision: 1 });
  assert.ok(!back.legalActions.some((a) => a.key.startsWith("continue_trip:")), "返程阶段不应提供续行选项");
});

test("收入结算应用居住地收入倍率：城区轮收入 = 保底 8 × 1.25 = 10（加健康奖励）", async () => {
  let now = 300;
  const state = createInitialState(1);
  state.homeId = "city";
  state.positionId = "city";
  state.money = 100;
  const repo = new MemoryRepository({ state, revision: 1, agentStatus: "offline", activeSessionId: null, agentId: null, sessionOpenedAt: null, processedRequests: [], updatedAt: 1 });
  const service = new AgentSessionService(repo, () => ++now);
  const online = await service.open({ agentId: "agent", requestId: "open-1", expectedRevision: 1 });
  const acted = await service.act({ sessionId: online.session.id!, requestId: "observe", expectedRevision: online.revision, decision: decision("observe") });
  const closed = await service.close({ sessionId: online.session.id!, requestId: "close-1", expectedRevision: acted.revision });
  const next = await service.open({ agentId: "agent", requestId: "open-2", expectedRevision: closed.revision });
  const income = next.state.ledger.find((e) => e.category === "收入");
  assert.ok(income, "应有收入流水");
  assert.equal(income?.amount, 10, "保底 8 × 城区倍率 1.25 = 10，健康 78 无奖励");
  assert.ok(income?.note.includes("倍率 1.25"), "流水备注应写明地点收入倍率");
});

test("user 只能提交信号与巡逻偏好",async()=>{const repository=new MemoryRepository();const service=new AgentSessionService(repository,()=>300);const snapshot=await service.userSignal({requestId:"signal",expectedRevision:1,mood:"焦虑",wish:"想去湖边",patrolEnabled:false,patrolMinutes:180});assert.equal(snapshot.state.moodSignal,"焦虑");assert.equal(snapshot.state.wish?.text,"想去湖边");assert.equal(snapshot.state.patrolEnabled,false);assert.equal(snapshot.state.patrolMinutes,180);assert.equal(snapshot.state.money,100);});

test("崩溃遗留的会话超时后可由新 agent 接续",async()=>{const repository=new MemoryRepository();let now=1_000;const service=new AgentSessionService(repository,()=>now);let online=await service.open({agentId:"old-agent",requestId:"open-old",expectedRevision:1});online=await service.act({sessionId:online.session.id!,requestId:"home",expectedRevision:online.revision,decision:decision("choose_home:station")});now+=AGENT_SESSION_TTL_MS+1;const observer=await service.observe();assert.equal(observer.session.status,"offline");const recovered=await service.open({agentId:"new-agent",requestId:"open-new",expectedRevision:online.revision});assert.equal(recovered.session.agentId,"new-agent");assert.equal(recovered.state.homeId,"station");assert.equal(recovered.state.clock.turn,2);});
