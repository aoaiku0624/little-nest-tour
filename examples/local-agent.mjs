#!/usr/bin/env node

const baseUrl=(process.env.LITTLE_NEST_URL||"http://localhost:3000").replace(/\/$/,"");
const token=process.env.LITTLE_NEST_AGENT_TOKEN||"";
const headers={"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})};
const maxSessions=Number(process.argv.find(arg=>arg.startsWith("--sessions="))?.split("=")[1]||30);

async function request(path,body){const response=await fetch(`${baseUrl}${path}`,{method:body?"POST":"GET",headers,body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(`${response.status}: ${data.error}`);return data;}
const id=()=>crypto.randomUUID();
const reason=action=>action.actionId==="choose_home"?"settle":["diagnose","treat","visit_clinic"].includes(action.actionId)?"health":action.actionId==="rest"?"energy":action.actionId==="comfort"?"mood":action.actionId==="buy"?"supplies":["plan_trip","check_health","depart_trip","review_plan"].includes(action.actionId)?"travel":["respond_event","resolve_event"].includes(action.actionId)?"event":"explore";

function pick(snapshot,used){const {state,legalActions}=snapshot;const find=predicate=>legalActions.find(action=>!used.has(action.key)&&predicate(action));return (
  find(a=>a.actionId==="choose_home"&&a.targetPlaceId==="station")||
  (state.condition!=="健康"&&(find(a=>a.actionId==="resolve_event")||find(a=>a.actionId==="respond_event")||find(a=>a.actionId==="diagnose")||find(a=>a.actionId==="treat")||find(a=>a.actionId==="visit_clinic")))||
  (state.stats.satiety<45&&(find(a=>a.actionId==="feed")||find(a=>a.itemId==="snack")||find(a=>a.itemId==="meal")))||
  (state.stats.energy<45&&find(a=>a.actionId==="rest"))||
  (state.plan?.kind==="trip"&&state.stats.satiety<55&&(find(a=>a.actionId==="feed")||find(a=>a.itemId==="snack")||find(a=>a.itemId==="meal")))||
  (state.plan?.kind==="trip"&&state.stats.energy<62&&find(a=>a.actionId==="rest"))||
  find(a=>a.actionId==="depart_trip")||
  (state.plan?.kind==="trip"&&state.plan.steps.find(step=>step.id==="supplies")?.status!=="完成"&&find(a=>a.itemId==="trip-kit"))||
  find(a=>a.actionId==="check_health")||find(a=>a.actionId==="plan_trip")||
  find(a=>a.actionId==="resolve_event")||find(a=>a.actionId==="respond_event")||
  (!state.plan&&find(a=>a.itemId==="trip-kit"))||
  find(a=>a.itemId==="snack")||find(a=>a.actionId==="clean")||find(a=>a.actionId==="observe")
);}

let initialChronicles=0;
for(let round=1;round<=maxSessions;round++){
  let snapshot=await request("/api/agent/session",{operation:"open",agentId:"standalone-example-agent",playerName:"旅行家",petName:"小团子",requestId:id()});
  if(round===1)initialChronicles=snapshot.state.travelChronicles.length;
  const sessionId=snapshot.session.id;
  const used=new Set();
  snapshot=await request("/api/agent/journal",{sessionId,expectedRevision:snapshot.revision,requestId:id(),revision:{observation:`第 ${snapshot.clock.turn} 轮：健康 ${snapshot.state.stats.health}，精力 ${snapshot.state.stats.energy}，余额 ${snapshot.state.money}。`,hypothesis:"先保留安全余量，再推进一次完整出游。",goal:"完成稳定照料与一次往返旅行",plan:"每步重新读取合法动作，最多安排两项。",outcome:"等待下次上线后复盘。"}});
  for(let step=0;step<2;step++){
    const action=pick(snapshot,used);if(!action)break;used.add(action.key);
    snapshot=await request("/api/agent/action",{sessionId,expectedRevision:snapshot.revision,requestId:id(),decision:{actionKey:action.key,reasonCode:reason(action),note:"安全余量足够，按当前事实推进",continueSession:step===0}});
  }
  const pending=snapshot.state.pendingActions.map(item=>item.option.label).join("、")||"无";
  snapshot=await request("/api/agent/session",{operation:"close",sessionId,expectedRevision:snapshot.revision,requestId:id()});
  console.log(`第 ${snapshot.clock.turn} 轮下线：${pending}`);
  if(snapshot.state.travelChronicles.length>initialChronicles){console.log(`旅行完成：${snapshot.state.travelChronicles[0].title}`);process.exit(0);}
}
throw new Error(`在 ${maxSessions} 次上线内未完成旅行`);
