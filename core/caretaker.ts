import type { ActionOption, Caretaker, Decision, DecisionContext } from "./model";

const find=(actions:ActionOption[],predicate:(action:ActionOption)=>boolean)=>actions.find(predicate);

/** Deterministic policy used only by rule-engine tests and the standalone example. */
export class ExampleAgentPolicy implements Caretaker {
  async decide(context:DecisionContext):Promise<Decision>{
    const {state,legalActions}=context;
    let choice:ActionOption|undefined;
    let goal=state.strategy.shortTermGoal;
    let hypothesis="当前信号不足，先用可逆行动收集证据。";
    if(!state.homeId){
      choice=find(legalActions,a=>a.key==="choose_home:station")??legalActions[0];
      goal="建立一个兼顾交通、商店和医疗的稳定起点";
      hypothesis="前期的不确定性很高，交通枢纽比单项资源优势更有容错。";
    } else if(state.activeEvents.some(event=>event.manualEndItemIds.length>0)&&legalActions.some(action=>action.actionId==="resolve_event")){
      choice=find(legalActions,a=>a.actionId==="resolve_event");goal="尽快终止持续负面影响";hypothesis="现有道具的确定性处理比继续承受逐轮损耗更划算。";
    } else if(state.activeEvents.length&&legalActions.some(action=>action.actionId==="respond_event")){
      const active=state.activeEvents[0];const preferred=active.kind==="opportunity"?(state.stats.energy>65&&state.strategy.riskTolerance>.45?"push":"steady"):active.kind==="discovery"?(state.stats.energy>50?"inspect":"preserve"):active.kind==="accident"?"rest-care":active.kind==="sickness"?"bed-rest":state.stats.energy<55?"linger":"record";
      choice=find(legalActions,a=>a.actionId==="respond_event"&&a.activeEventId===active.id&&a.eventResponseId===preferred)??find(legalActions,a=>a.actionId==="respond_event");goal=`主动应对${active.name}`;hypothesis="持续事件有多种合法处理方式，当前资源决定更看重收益、恢复还是保留道具。";
    } else if(state.condition!=="健康"){
      choice=find(legalActions,a=>a.actionId==="diagnose")??find(legalActions,a=>a.actionId==="treat")??find(legalActions,a=>a.actionId==="visit_clinic")??find(legalActions,a=>a.itemId==="bandage")??find(legalActions,a=>a.itemId==="medicine")??find(legalActions,a=>a.actionId==="emergency_relief");
      goal="先安全恢复，再继续原计划";
      hypothesis=state.stats.health<45?"状态偏弱，就医的确定性值得额外费用。":"小意外可能用现有物资居家处理。";
      if(state.plan?.kind==="recovery"&&state.plan.steps.find(s=>s.id==="diagnose")?.status==="完成")choice=find(legalActions,a=>a.actionId==="treat")??find(legalActions,a=>a.actionId==="visit_clinic")??find(legalActions,a=>a.itemId==="bandage")??find(legalActions,a=>a.itemId==="medicine")??find(legalActions,a=>a.actionId==="emergency_relief")??choice;
    } else if(state.stats.satiety<42){
      choice=find(legalActions,a=>a.actionId==="feed")??find(legalActions,a=>a.itemId==="snack")??find(legalActions,a=>a.itemId==="meal");goal="先稳定基本需求";hypothesis="空腹会放大后续活动的健康风险。";
    } else if(state.stats.energy<40){
      choice=find(legalActions,a=>a.actionId==="rest");goal="恢复精力余量";hypothesis="疲劳时继续推进计划的意外成本更高。";
    } else if(state.plan?.kind==="trip"){
      const supplyDone=state.plan.steps.find(s=>s.id==="supplies")?.status==="完成";
      const healthDone=state.plan.steps.find(s=>s.id==="health")?.status==="完成";
      if(!supplyDone)choice=find(legalActions,a=>a.itemId==="trip-kit");
      if(!choice&&!healthDone)choice=find(legalActions,a=>a.actionId==="check_health");
      if(!choice)choice=find(legalActions,a=>a.actionId==="depart_trip");
      if(!choice)choice=find(legalActions,a=>a.actionId==="review_plan");
      goal=state.plan.goal;
      hypothesis="每一步都要重新核验预算、物资、健康和天气，不能因为旧计划而硬走。";
    } else if(state.wish&&!state.wish.considered&&/旅行|出去|湖|海|玩|远门/.test(state.wish.text)){
      const keyword=/海/.test(state.wish.text)?"coast":/湖/.test(state.wish.text)?"lake":null;
      choice=find(legalActions,a=>a.actionId==="plan_trip"&&(!keyword||a.targetPlaceId===keyword));
      choice??=legalActions.filter(a=>a.actionId==="plan_trip").sort((a,b)=>a.cost-b.cost)[0];
      goal="认真评估愿望，但不把愿望当命令";
      hypothesis="一次准备充分的短途旅行可能改善心情并带来收藏。";
    } else if(state.stats.mood<55||["低落","焦虑"].includes(state.moodSignal)){
      choice=find(legalActions,a=>a.actionId==="comfort")??find(legalActions,a=>a.actionId==="observe");goal="降低情绪压力";hypothesis="陪伴比立即消费更适合当前信号。";
    } else {
      const foodCount=state.inventory.filter(i=>i.kind==="food").reduce((sum,i)=>sum+i.usesRemaining,0);
      if(foodCount<2&&state.money-state.strategy.reserveTarget>8)choice=find(legalActions,a=>a.itemId==="snack")??find(legalActions,a=>a.itemId==="meal");
      choice??=find(legalActions,a=>a.actionId==="observe")??legalActions[0];
      goal=foodCount<2?"补充日常安全库存":"继续了解宠物偏好";
      hypothesis=foodCount<2?"在价格合适时补货能减少未来被迫高价采购。":"保持观察可以避免过度干预。";
    }
    const alreadyQueued=new Set(state.pendingActions.map(item=>item.option.key));
    if(choice&&alreadyQueued.has(choice.key))choice=legalActions.find(action=>!alreadyQueued.has(action.key));
    choice??=legalActions[0];
    const reasonCode=choice.actionId==="choose_home"?"settle":choice.actionId==="comfort"?"mood":choice.actionId==="rest"?"energy":["diagnose","treat","visit_clinic"].includes(choice.actionId)?"health":choice.actionId==="buy"?"supplies":["respond_event","resolve_event"].includes(choice.actionId)?"event":choice.actionId==="emergency_relief"?"budget":["plan_trip","check_health","depart_trip","review_plan"].includes(choice.actionId)?(state.wish&&!state.wish.considered?"wish":"travel"):"explore";
    return {actionKey:choice.key,reasonCode,note:`${goal}：${hypothesis}`.slice(0,48),continueSession:state.pendingActions.length<2&&legalActions.length>1};
  }
}
