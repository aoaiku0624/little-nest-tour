import { AgentSessionService, agentSnapshot, AgentApiError } from "../../../../core/agent-session";
import { D1GameRepository } from "../../../../db/game-store";
import { jsonError, requireAgent } from "../../api-utils";

const repository=()=>new D1GameRepository();
export async function GET(request:Request){try{requireAgent(request);const record=await repository().load();const sessionId=new URL(request.url).searchParams.get("sessionId");if(sessionId&&record.activeSessionId!==sessionId)throw new AgentApiError(409,"会话已失效");return Response.json(agentSnapshot(record));}catch(error){return jsonError(error);}}
export async function POST(request:Request){try{requireAgent(request);const body=await request.json() as {operation?:"open"|"close";agentId?:string;playerName?:string;petName?:string;sessionId?:string;requestId:string;expectedRevision?:number};const service=new AgentSessionService(repository());const result=body.operation==="close"?await service.close({sessionId:String(body.sessionId??""),requestId:body.requestId,expectedRevision:Number(body.expectedRevision)}):await service.open({agentId:String(body.agentId??"local-agent"),playerName:body.playerName,petName:body.petName,requestId:body.requestId,expectedRevision:body.expectedRevision});return Response.json(result);}catch(error){return jsonError(error);}}
