import type { Mood } from "../../../core/model";
import { AgentSessionService } from "../../../core/agent-session";
import { D1GameRepository } from "../../../db/game-store";
import { jsonError } from "../api-utils";

const service=()=>new AgentSessionService(new D1GameRepository());
export async function GET(){try{return Response.json(await service().observe());}catch(error){return jsonError(error);}}
export async function POST(request:Request){try{const body=await request.json() as {type?:"signal"|"import";requestId:string;expectedRevision:number;mood?:Mood;wish?:string;patrolEnabled?:boolean;patrolMinutes?:number;chronicleId?:string;comment?:string;state?:unknown};const game=service();return Response.json(body.type==="import"?await game.importLegacy({requestId:body.requestId,expectedRevision:body.expectedRevision,state:body.state}):await game.userSignal({requestId:body.requestId,expectedRevision:body.expectedRevision,mood:body.mood,wish:body.wish,patrolEnabled:body.patrolEnabled,patrolMinutes:body.patrolMinutes,chronicleId:body.chronicleId,comment:body.comment}));}catch(error){return jsonError(error);}}
