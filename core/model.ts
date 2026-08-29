export type Mood = "平静" | "开心" | "低落" | "焦虑" | "困倦";
export type Season = "春" | "夏" | "秋" | "冬";
export type Weather = "晴" | "多云" | "雨" | "风" | "雾" | "雪" | "暴风雨";
export type Condition = "健康" | "轻伤" | "生病" | "恢复中";
// 地点 id 由内容包注册并由 content validation 校验，新增地点无需再修改规则类型。
export type PlaceId = string;
export type ItemKind = "food" | "medicine" | "outfit" | "trip" | "souvenir" | "resource";

export interface PetStats { health:number; mood:number; energy:number; satiety:number; activity:number; experience:number; }
export interface InventoryItem { id:string; name:string; kind:ItemKind; usesRemaining:number; maxUses:number; }
export interface Keepsake { id:string; itemId:string; name:string; body:string; kind:"love-letter"|"note"; sourcePlaceId:PlaceId; sourcePlaceName:string; acquiredTurn:number; }
export interface Wish { id:string; text:string; createdAt:number; considered:boolean; }
export interface PublicLogEntry { id:string; at:number; turn:number; category:"状态"|"行动"|"费用"|"旅行"|"事件"|"系统"; title:string; text:string; deltas?:Partial<PetStats>; moneyDelta?:number; }
export interface JournalRevision { at:number; turn:number; observation:string; hypothesis:string; goal:string; plan:string; outcome:string; }
export interface CaretakerJournalEntry { id:string; createdAt:number; revisions:JournalRevision[]; }
export interface LedgerEntry { id:string; at:number; turn:number; category:"住房"|"收入"|"采购"|"旅行"|"医疗"|"救济"|"探索"; amount:number; balance:number; note:string; }
export interface ShopOffer { itemId:string; name:string; kind:ItemKind; price:number; stock:number; basePrice:number; uses:number; }
export interface PreferenceHypothesis { trait:string; confidence:number; evidence:string[]; }
export interface CarePlanStep { id:string; label:string; status:"待办"|"完成"|"跳过"; }
export interface CarePlan { id:string; kind:"trip"|"recovery"; goal:string; targetPlaceId?:PlaceId; createdAt:number; steps:CarePlanStep[]; }
export interface Strategy { riskTolerance:number; reserveTarget:number; shortTermGoal:string; longTermGoal:string; budgetStyle:"保守"|"均衡"|"体验优先"; }
export interface TurnClock { turn:number; day:number; month:number; period:"昼"|"夜"; }
export type TravelStage = "outbound"|"play"|"overnight"|"return";
export interface TravelMoment { turn:number; stage:TravelStage; title:string; text:string; agentHandling?:string; }
export interface ActiveJourney { id:string; routeId:string; destinationId:PlaceId; startedTurn:number; stage:TravelStage; remainingTurns:number; overnightCount:number; incidentRiskMultiplier:number; moments:TravelMoment[]; pendingContinue?: { routeId:string; destinationId:PlaceId; cost:number } | null; }
export interface TravelComment { id:string; at:number; text:string; }
export interface TravelChronicle { id:string; destinationId:PlaceId; startedTurn:number; endedTurn:number; title:string; summary:string; agentSummary:string; moments:TravelMoment[]; comments:TravelComment[]; }
export interface QueuedAction { id:string; turn:number; option:ActionOption; decision:Decision; }
export type DecisionReasonCode = "health"|"energy"|"mood"|"supplies"|"budget"|"wish"|"travel"|"event"|"explore"|"settle";
export interface SettledDecision { id:string; turn:number; actionLabel:string; reasonCode:DecisionReasonCode; note:string; cost:number; }
export interface DelayedEffect { id:string; dueTurn:number; kind:"travel_injury"|"trip_return"|"recovery_complete"; severity:number; source:string; }
export interface EventResponse { id:string; label:string; description:string; statDelta:Partial<PetStats>; moneyDelta:number; durationDelta:number; }
export interface EventFollowUp { id:string; name:string; chance:number; kind:WeightedEvent["kind"]; text:string; durationTurns:number; statDelta:Partial<PetStats>; perTurnDelta:Partial<PetStats>; manualEndItemIds:string[]; responses:readonly EventResponse[]; }
export interface ActiveEvent { id:string; definitionId:string; name:string; kind:WeightedEvent["kind"]; startedTurn:number; remainingTurns:number; perTurnDelta:Partial<PetStats>; manualEndItemIds:string[]; responses:readonly EventResponse[]; followUp?:EventFollowUp; source:string; }

export interface GameState {
  version:4; petName:string; playerName:string; identityConfigured:boolean; startedAt:number; now:number; clock:TurnClock; nextPatrolAt:number; patrolEnabled:boolean; patrolMinutes:number;
  money:number; debt:number; moodSignal:Mood; wish:Wish|null; homeId:PlaceId|null; positionId:PlaceId|null; homeChoiceReason:string;
  condition:Condition; weather:Weather; season:Season; stats:PetStats; previousStats:PetStats|null; inventory:InventoryItem[]; shop:ShopOffer[]; publicLog:PublicLogEntry[];
  caretakerJournal:CaretakerJournalEntry[]; ledger:LedgerEntry[]; plan:CarePlan|null; strategy:Strategy; preferenceHypotheses:PreferenceHypothesis[];
  delayedEffects:DelayedEffect[]; activeEvents:ActiveEvent[]; pendingActions:QueuedAction[]; recentEventIds:string[]; collections:string[]; keepsakes:Keepsake[]; visitedPlaces:PlaceId[]; currentRouteId:string|null;
  activeJourney:ActiveJourney|null; travelChronicles:TravelChronicle[]; lastSettledDecisions:SettledDecision[];
  lastTravelTurn:number|null; consecutiveTrips:number; shopCycle:number; rngSeed:number;
}

export type ActionId = "choose_home"|"move_home"|"observe"|"comfort"|"feed"|"clean"|"rest"|"train"|"diagnose"|"treat"|"visit_clinic"|"buy"|"plan_trip"|"check_health"|"depart_trip"|"continue_trip"|"review_plan"|"photo_diary"|"respond_event"|"resolve_event"|"emergency_relief";
export interface ActionOption { key:string; actionId:ActionId; label:string; description:string; cost:number; targetPlaceId?:PlaceId; itemId?:string; routeId?:string; activeEventId?:string; eventResponseId?:string; hiddenConsequences:string[]; }
export interface DecisionContext { state:GameState; legalActions:ActionOption[]; latestWish:Wish|null; recentPublicFacts:readonly PublicLogEntry[]; privateJournal:readonly CaretakerJournalEntry[]; world:WorldContract; rules:RuleContract; }
export interface Decision { actionKey:string; reasonCode:DecisionReasonCode; note:string; continueSession?:boolean; }
export interface Caretaker { decide(context:DecisionContext):Promise<Decision>; }

export interface WeightedEvent { id:string; name:string; weight:number; kind:"calm"|"opportunity"|"discovery"|"accident"|"sickness"; text:string; statDelta:Partial<PetStats>; moneyDelta:number; durationTurns:number; perTurnDelta:Partial<PetStats>; manualEndItemIds:string[]; responses:readonly EventResponse[]; followUp?:EventFollowUp; }
export interface DropInteraction { kind:"love-letter"|"note"; titleTemplate:string; bodyTemplate:string; }
export interface ItemDrop { itemId:string; name:string; kind:ItemKind; weight:number; uses:number; interaction?:DropInteraction; }
export interface ItemDefinition { id:string; name:string; kind:ItemKind; basePrice:number; minLevel:number; uses:number; }
export interface NumericYield { money:[number,number]; experience:[number,number]; mood:[number,number]; baseItemChance:number; }
export interface TriggerChance { day:number; night:number; }
export interface PlaceNode { id:PlaceId; name:string; housingCost:number; startingStats:PetStats; shopLevel:number; medicalLevel:number; dailyCost:number; incomeMultiplier:number; travelMultiplier:number; eventTriggerChance?:TriggerChance; eventTable:readonly WeightedEvent[]; numericYield:NumericYield; itemPool:readonly ItemDrop[]; resources:string[]; summary:string; x:number; y:number; }
export interface RouteEdge { id:string; from:PlaceId; to:PlaceId; distance:number; travelTurns:number; transportCost:number; lodgingCost:number; foodCost:number; emergencyReserve:number; risk:number; eventTriggerChance?:TriggerChance; eventTable?:readonly WeightedEvent[]; resources:string[]; }
export interface WorldContract { places:readonly PlaceNode[]; routes:readonly RouteEdge[]; season:Season; weather:Weather; currentPlace:PlaceNode|null; placeEventTriggerChances:Readonly<Record<PlaceId,TriggerChance>>; routeEventTriggerChances:Readonly<Record<string,TriggerChance>>; routeEventTable:readonly WeightedEvent[]; }
export interface RuleContract { time:{turnsPerDay:2;daysPerMonth:10;settlement:"next_login"}; authority:string[]; travel:{growthDistanceBands:readonly {minExperience:number;maxDistance:number}[];lowGrowthCooldownTurns:number}; itemUse:string; resultVisibility:string; }
export interface LegacyGameStateV1 { version:1; [key:string]:unknown; }
