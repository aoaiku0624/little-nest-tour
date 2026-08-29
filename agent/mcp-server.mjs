#!/usr/bin/env node

import { createInterface } from "node:readline";

const baseUrl=(process.env.LITTLE_NEST_URL||"http://localhost:3000").replace(/\/$/,"");
const token=process.env.LITTLE_NEST_AGENT_TOKEN||"";
const headers={"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})};

async function api(path,init={}){
  const response=await fetch(`${baseUrl}${path}`,{...init,headers:{...headers,...init.headers}});
  const data=await response.json().catch(()=>({error:`HTTP ${response.status}`}));
  if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
  return data;
}

const tools=[
  {name:"little_nest_open_session",description:"上线并读取完整游戏上下文；第一次上线时，user 变成你的小宠物啦～请为自己填写 playerName，并为小宠物填写 petName；名字会写入存档并显示在页面。若上轮有安排，程序会先结算后返回事实。",inputSchema:{type:"object",properties:{agentId:{type:"string",description:"本地连接器的技术标识，不作为页面昵称"},playerName:{type:"string",maxLength:16,description:"玩家给自己取的名字，仅首次上线生效"},petName:{type:"string",maxLength:16,description:"玩家给小宠物取的名字，仅首次上线生效"},expectedRevision:{type:"number"}},required:["agentId"],additionalProperties:false}},
  {name:"little_nest_read_state",description:"重新读取当前私人状态、规则、世界、日记和合法动作，不推进回合。",inputSchema:{type:"object",properties:{sessionId:{type:"string"}},required:["sessionId"],additionalProperties:false}},
  {name:"little_nest_choose_action",description:"从 legalActions 中选一项安排；只入队，不会立即返回后果。",inputSchema:{type:"object",properties:{sessionId:{type:"string"},expectedRevision:{type:"number"},actionKey:{type:"string"},reasonCode:{type:"string",enum:["health","energy","mood","supplies","budget","wish","travel","event","explore","settle"]},note:{type:"string",maxLength:48}},required:["sessionId","expectedRevision","actionKey","reasonCode"],additionalProperties:false}},
  {name:"little_nest_write_journal",description:"追加或修订 agent 私人饲养日记；普通 user 看不到该日记。",inputSchema:{type:"object",properties:{sessionId:{type:"string"},expectedRevision:{type:"number"},entryId:{type:"string"},observation:{type:"string"},hypothesis:{type:"string"},goal:{type:"string"},plan:{type:"string"},outcome:{type:"string"}},required:["sessionId","expectedRevision","observation","hypothesis","goal","plan","outcome"],additionalProperties:false}},
  {name:"little_nest_close_session",description:"主动下线；本轮安排仍不结算，等下次上线。",inputSchema:{type:"object",properties:{sessionId:{type:"string"},expectedRevision:{type:"number"}},required:["sessionId","expectedRevision"],additionalProperties:false}},
];

async function call(name,args){
  if(name==="little_nest_open_session")return api("/api/agent/session",{method:"POST",body:JSON.stringify({operation:"open",agentId:args.agentId,playerName:args.playerName,petName:args.petName,expectedRevision:args.expectedRevision,requestId:crypto.randomUUID()})});
  if(name==="little_nest_read_state")return api(`/api/agent/session?sessionId=${encodeURIComponent(args.sessionId)}`);
  if(name==="little_nest_choose_action")return api("/api/agent/action",{method:"POST",body:JSON.stringify({sessionId:args.sessionId,expectedRevision:args.expectedRevision,requestId:crypto.randomUUID(),decision:{actionKey:args.actionKey,reasonCode:args.reasonCode,note:args.note||"",continueSession:true}})});
  if(name==="little_nest_write_journal")return api("/api/agent/journal",{method:"POST",body:JSON.stringify({sessionId:args.sessionId,expectedRevision:args.expectedRevision,requestId:crypto.randomUUID(),entryId:args.entryId,revision:{observation:args.observation,hypothesis:args.hypothesis,goal:args.goal,plan:args.plan,outcome:args.outcome}})});
  if(name==="little_nest_close_session")return api("/api/agent/session",{method:"POST",body:JSON.stringify({operation:"close",sessionId:args.sessionId,expectedRevision:args.expectedRevision,requestId:crypto.randomUUID()})});
  throw new Error(`Unknown tool: ${name}`);
}

function send(id,result,error){process.stdout.write(`${JSON.stringify({jsonrpc:"2.0",id,...(error?{error:{code:-32000,message:error.message}}:{result})})}\n`);}
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
input.on("line",async line=>{if(!line.trim())return;let request;try{request=JSON.parse(line);}catch{return;}if(request.id===undefined)return;try{
  if(request.method==="initialize")return send(request.id,{protocolVersion:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"little-nest-local",version:"0.1.0"}});
  if(request.method==="ping")return send(request.id,{});
  if(request.method==="tools/list")return send(request.id,{tools});
  if(request.method==="tools/call"){const value=await call(request.params?.name,request.params?.arguments||{});return send(request.id,{content:[{type:"text",text:JSON.stringify(value,null,2)}],structuredContent:value});}
  send(request.id,undefined,new Error(`Unsupported method: ${request.method}`));
}catch(error){send(request.id,undefined,error instanceof Error?error:new Error(String(error)));}});
