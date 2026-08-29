"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GameState } from "../../core/model";

type DebugSnapshot={revision:number;session:{status:"online"|"offline";agentId:string|null};state:GameState;privateJournal:GameState["caretakerJournal"]};

export function DebugPanel(){
  const [snapshot,setSnapshot]=useState<DebugSnapshot|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;const read=async()=>{try{const response=await fetch("/api/debug",{cache:"no-store"});if(!response.ok)throw new Error("调试入口不可用");const next=await response.json() as DebugSnapshot;if(active){setSnapshot(next);setError("");}}catch(reason){if(active)setError(reason instanceof Error?reason.message:"读取失败");}};void read();const timer=setInterval(()=>void read(),2000);return()=>{active=false;clearInterval(timer);};},[]);
  if(error)return <main className="debugShell">{error}</main>;
  if(!snapshot)return <main className="debugShell">读取权威存档…</main>;
  const {state}=snapshot;
  return <main className="debugShell"><header><div><span className="eyebrow">DEVELOPMENT · READ ONLY</span><h1>后台饲养日记</h1><p>只读查看外部 agent 的判断修订；这里不代替玩家行动。</p></div><Link href="/">返回观察窗</Link></header><section className="debugState"><span>存档版本 {snapshot.revision}</span><span>{snapshot.session.status==="online"?`${snapshot.session.agentId??"agent"} 已上线`:"agent 已下线"}</span><span>第 {state.clock.turn} 轮</span><span>待结算 {state.pendingActions.length}</span><span>状况 {state.condition}</span><span>私人条目 {snapshot.privateJournal.length}</span><span>公开事实 {state.publicLog.length}</span><span>延迟后果 {state.delayedEffects.length}</span></section><section className="privateEntries">{snapshot.privateJournal.map(entry=><article key={entry.id}><div><time>{new Date(entry.createdAt).toLocaleString("zh-CN")}</time><b>版本 {entry.revisions.length}</b></div>{entry.revisions.map((revision,index)=><section key={`${revision.at}-${index}`}><h2>第 {revision.turn} 轮 · 修订 {index+1}</h2><dl><dt>观察</dt><dd>{revision.observation}</dd><dt>假设</dt><dd>{revision.hypothesis}</dd><dt>目标</dt><dd>{revision.goal}</dd><dt>计划</dt><dd>{revision.plan}</dd><dt>结果</dt><dd>{revision.outcome}</dd></dl></section>)}</article>)}</section></main>;
}
