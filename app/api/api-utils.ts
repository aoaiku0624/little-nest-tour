import { AgentApiError } from "../../core/agent-session";

export function requireAgent(request:Request){const required=typeof process!=="undefined"?process.env.AGENT_TOKEN?.trim():"";if(!required)return;const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim();if(supplied!==required)throw new AgentApiError(401,"无效的 agent token");}
export function jsonError(error:unknown){if(error instanceof AgentApiError)return Response.json({error:error.message},{status:error.status});return Response.json({error:error instanceof Error?error.message:"系统请求失败"},{status:500});}
