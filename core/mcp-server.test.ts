import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

test("本地 MCP 可完成初始化并公开五个 agent 玩家工具",async()=>{
  const child=spawn(process.execPath,["agent/mcp-server.mjs"],{cwd:process.cwd(),stdio:["pipe","pipe","inherit"]});
  const lines:string[]=[];
  child.stdout.setEncoding("utf8");
  child.stdout.on("data",chunk=>lines.push(...String(chunk).trim().split("\n").filter(Boolean)));
  const initialize={jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"test",version:"1"}}};
  child.stdin.write(`${JSON.stringify(initialize)}\n`);
  child.stdin.write(`${JSON.stringify({jsonrpc:"2.0",id:2,method:"tools/list",params:{}})}\n`);
  for(let attempt=0;attempt<50&&lines.length<2;attempt++)await new Promise(resolve=>setTimeout(resolve,10));
  child.stdin.end();
  await once(child,"exit");
  assert.equal(lines.length,2);
  const initialized=JSON.parse(lines[0]);
  const listed=JSON.parse(lines[1]);
  assert.equal(initialized.result.serverInfo.name,"little-nest-local");
  assert.deepEqual(listed.result.tools.map((tool:{name:string})=>tool.name),["little_nest_open_session","little_nest_read_state","little_nest_choose_action","little_nest_write_journal","little_nest_close_session"]);
  const open=listed.result.tools[0];
  assert.ok(open.inputSchema.properties.playerName);
  assert.ok(open.inputSchema.properties.petName);
});
