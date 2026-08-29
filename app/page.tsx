import { GameApp } from "./ui/GameApp";

export const metadata = {
  title: "小窝巡游 · 外部 Agent 玩家",
  description: "一个纯本地优先、由独立 agent 饲养 user 的异步养成游戏。",
};

export default function Home() {
  return <GameApp />;
}
