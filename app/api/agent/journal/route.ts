import type { JournalRevision } from "../../../../core/model";
import { AgentSessionService } from "../../../../core/agent-session";
import { D1GameRepository } from "../../../../db/game-store";
import { jsonError, requireAgent } from "../../api-utils";

export async function POST(request:Request){try{requireAgent(request);const body=await request.json() as {sessionId:string;requestId:string;expectedRevision:number;entryId?:string;revision:Omit<JournalRevision,"at"|"turn">};return Response.json(await new AgentSessionService(new D1GameRepository()).journal(body));}catch(error){return jsonError(error);}}
