import { agentSnapshot } from "../../../core/agent-session";
import { D1GameRepository } from "../../../db/game-store";

export async function GET(){
  if(process.env.NODE_ENV==="production")return Response.json({error:"仅本地开发模式可用"},{status:404});
  return Response.json(agentSnapshot(await new D1GameRepository().load()));
}
