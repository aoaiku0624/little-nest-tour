import { FRONTIER_EXPANSION } from "./content/frontier-expansion";
import type { WorldContentPack } from "./content/types";
import { assertValidWorldContent } from "./content/validate";
import type { EventFollowUp, EventResponse, ItemDefinition, ItemDrop, ItemKind, NumericYield, PlaceId, PlaceNode, RouteEdge, Season, ShopOffer, TriggerChance, Weather, WeightedEvent } from "./model";

const stats=(health:number,mood:number,energy:number,satiety:number,activity:number,experience:number)=>({health,mood,energy,satiety,activity,experience});
const response=(id:string,label:string,description:string,statDelta:EventResponse["statDelta"],moneyDelta=0,durationDelta=0):EventResponse=>({id,label,description,statDelta,moneyDelta,durationDelta});
const defaultResponses:Record<WeightedEvent["kind"],readonly EventResponse[]>={calm:[response("linger","多留一会","换取恢复与安定",{mood:4,energy:2},0,-1),response("record","记录细节","把体验变成成长证据",{experience:4,mood:1},0,-1)],opportunity:[response("steady","稳妥完成","少透支体力，领取普通报酬",{energy:-2},4,-1),response("push","抓住机会","承担疲劳换取更高报酬",{energy:-7,activity:3},8,-1)],discovery:[response("inspect","深入调查","消耗精力换取更多成长",{experience:6,energy:-3},0,-1),response("preserve","保护现场","保留线索并优先稳定心情",{mood:5,experience:2},0,-1)],accident:[response("rest-care","减少活动","用休息缩短影响，但暂时降低活跃",{health:3,activity:-3},0,-1),response("observe-injury","继续观察","保留道具并承受正常持续影响",{mood:1},0,0)],sickness:[response("bed-rest","严格休息","牺牲活跃换取更快缓解",{energy:5,activity:-4},0,-1),response("light-routine","维持轻作息","保持心情，但恢复速度不变",{mood:3},0,0)]};
const follow=(id:string,name:string,chance:number,kind:WeightedEvent["kind"],text:string,statDelta:EventFollowUp["statDelta"],durationTurns=2,perTurnDelta:EventFollowUp["perTurnDelta"]={},manualEndItemIds:string[]=[]):EventFollowUp=>({id,name,chance,kind,text,statDelta,durationTurns,perTurnDelta,manualEndItemIds,responses:defaultResponses[kind]});
const event=(id:string,name:string,weight:number,kind:WeightedEvent["kind"],text:string,statDelta:WeightedEvent["statDelta"]={},moneyDelta=0,durationTurns?:number,perTurnDelta?:WeightedEvent["perTurnDelta"],manualEndItemIds?:string[],followUp?:EventFollowUp):WeightedEvent=>{const defaults={calm:{durationTurns:1,perTurnDelta:{mood:1},manualEndItemIds:[]},opportunity:{durationTurns:2,perTurnDelta:{energy:-1},manualEndItemIds:[]},discovery:{durationTurns:2,perTurnDelta:{experience:2,energy:-1},manualEndItemIds:[]},accident:{durationTurns:3,perTurnDelta:{health:-3,activity:-2},manualEndItemIds:["bandage"]},sickness:{durationTurns:3,perTurnDelta:{health:-2,energy:-3},manualEndItemIds:["medicine","herb","mild-dose","scarf","raincoat"]}}[kind];return {id,name,weight,kind,text,statDelta,moneyDelta,durationTurns:durationTurns??defaults.durationTurns,perTurnDelta:perTurnDelta??defaults.perTurnDelta,manualEndItemIds:manualEndItemIds??defaults.manualEndItemIds,responses:defaultResponses[kind],followUp};};
const drop=(itemId:string,name:string,kind:ItemKind,weight:number,uses:number):ItemDrop=>({itemId,name,kind,weight,uses});
const yieldOf=(money:[number,number],experience:[number,number],mood:[number,number],baseItemChance:number):NumericYield=>({money,experience,mood,baseItemChance});

const BASE_PLACES:readonly PlaceNode[]=[
  {id:"forest",name:"雾杉林屋",housingCost:20,startingStats:stats(75,78,75,52,70,8),shopLevel:1,medicalLevel:1,dailyCost:5,incomeMultiplier:.85,travelMultiplier:1.15,summary:"采集收益高，医疗遥远，意外偏多",x:16,y:22,resources:["蘑菇","松果","药草"],numericYield:yieldOf([1,5],[2,6],[0,4],.62),eventTable:[event("forest-calm","林间静息",34,"calm","在树影里安静休息。",{energy:5,mood:3}),event("forest-forage","林下采集",32,"opportunity","发现了可换钱的林下物资。",{activity:3},3),event("forest-secret","雾中小径",18,"discovery","记住了一条只有晴天清晰的小径。",{experience:5,mood:4},0,2,{experience:2,energy:-1},[],follow("forest-marker","雾中旧标记",.48,"discovery","旧树皮上的刻痕指向更深处。",{experience:5,mood:2})),event("forest-slip","湿苔打滑",12,"accident","踩到湿苔，出现可恢复的小擦伤。",{health:-8,mood:-2}),event("forest-cold","林雾受凉",4,"sickness","林雾太重，身体有些不舒服。",{health:-9,energy:-5})],itemPool:[drop("herb","林间药草","medicine",38,2),drop("pinecone","纹路松果","souvenir",34,1),drop("mushroom","软帽蘑菇","resource",28,2)]},
  {id:"hill",name:"风铃山村",housingCost:25,startingStats:stats(82,74,70,62,55,8),shopLevel:2,medicalLevel:2,dailyCost:5,incomeMultiplier:.9,travelMultiplier:1.05,summary:"生活安稳，收益温和，风险较低",x:34,y:10,resources:["香草","羊毛","野果"],numericYield:yieldOf([2,6],[1,5],[1,5],.54),eventTable:[event("hill-bells","听见风铃",42,"calm","山风吹响了屋檐下的风铃。",{mood:5}),event("hill-errand","村中帮忙",30,"opportunity","帮村民跑了趟腿，得到一点谢礼。",{activity:2},4,2,{energy:-1},[],follow("hill-thanks","村民的回礼",.42,"opportunity","熟悉的村民带来一份追加委托和回礼。",{mood:3},2,{energy:-1})),event("hill-meadow","发现草坡",18,"discovery","找到一片适合散步的新草坡。",{experience:4,mood:3}),event("hill-stumble","山路绊倒",7,"accident","在石阶边轻轻绊了一下。",{health:-5}),event("hill-chill","夜风受凉",3,"sickness","夜风比预想更冷。",{health:-7,energy:-3})],itemPool:[drop("herb-bundle","香草束","resource",38,3),drop("wool-charm","羊毛挂饰","souvenir",32,1),drop("wild-berry","山野果","food",30,2)]},
  {id:"station",name:"银杏站郊",housingCost:45,startingStats:stats(80,70,68,65,58,10),shopLevel:3,medicalLevel:3,dailyCost:7,incomeMultiplier:1,travelMultiplier:.8,summary:"交通便利，事件与收益最均衡",x:50,y:48,resources:["车票","旧书","便当"],numericYield:yieldOf([3,8],[2,6],[0,4],.48),eventTable:[event("station-watch","站台观察",32,"calm","看列车来去，记下了新的方向。",{experience:2}),event("station-task","临时委托",34,"opportunity","完成了一件站务小委托。",{activity:3},6),event("station-book","旧书摊",22,"discovery","从旧书页里发现一张手绘地图。",{experience:5,mood:2},0,2,{experience:2,energy:-1},[],follow("station-map-page","缺页地图的线索",.50,"discovery","旧书摊老板想起缺失地图页的去向。",{experience:6,mood:2})),event("station-crowd","人群碰撞",8,"accident","在人群里被轻轻撞到。",{health:-5,mood:-2}),event("station-rain","候车受凉",4,"sickness","候车时淋了些雨。",{health:-7,energy:-4})],itemPool:[drop("ticket-stub","纪念车票","souvenir",34,1),drop("old-book","旧旅行书","resource",28,3),drop("station-bento","站台便当","food",38,2)]},
  {id:"city",name:"灯火城区",housingCost:55,startingStats:stats(76,64,62,70,48,14),shopLevel:5,medicalLevel:5,dailyCost:11,incomeMultiplier:1.25,travelMultiplier:1,summary:"数字收益最高，医疗完善，压力事件较多",x:80,y:22,resources:["药品","服装","电子券"],numericYield:yieldOf([5,12],[2,7],[-2,3],.42),eventTable:[event("city-window","橱窗散步",25,"calm","在灯火下慢慢走了一圈。",{mood:2,activity:2}),event("city-gig","短时工作",42,"opportunity","接到一份短时工作。",{energy:-4},9),event("city-exhibit","街角展览",18,"discovery","偶遇一场小型展览。",{experience:6,mood:3},0,2,{experience:2,energy:-1},[],follow("city-curator","策展人的邀请",.46,"opportunity","策展人邀请宠物帮忙布置下一场小展览。",{experience:4,mood:3},2,{energy:-2})),event("city-bump","街口擦碰",6,"accident","在拥挤街口发生轻微擦碰。",{health:-4}),event("city-stress","城市疲劳",9,"sickness","嘈杂和作息让身体有些吃不消。",{health:-6,energy:-6,mood:-3})],itemPool:[drop("coupon","电子券","resource",42,2),drop("city-pin","霓虹徽章","souvenir",28,1),drop("mild-dose","便携药剂","medicine",30,2)]},
  {id:"lake",name:"月湖木屋",housingCost:35,startingStats:stats(78,84,74,56,62,9),shopLevel:2,medicalLevel:2,dailyCost:6,incomeMultiplier:.9,travelMultiplier:1.05,summary:"心情收益最好，收藏丰富，湿滑风险稍高",x:20,y:78,resources:["水产","玻璃石","芦苇"],numericYield:yieldOf([1,6],[2,7],[3,8],.65),eventTable:[event("lake-reflection","湖畔发呆",35,"calm","湖面很安静，心情慢慢舒展。",{mood:7,energy:3}),event("lake-fishing","浅滩收获",26,"opportunity","在浅滩找到可交换的小收获。",{activity:3},4),event("lake-stone","月光玻璃石",24,"discovery","捡到一颗被湖水磨圆的玻璃石。",{experience:5,mood:5},0,2,{experience:2,energy:-1},[],follow("lake-glow","夜里的微光",.52,"discovery","那颗玻璃石在夜里映出湖中另一处微光。",{experience:6,mood:5})),event("lake-slip","岸边滑倒",11,"accident","在潮湿岸边滑了一下。",{health:-7,energy:-3}),event("lake-damp","湿气受凉",4,"sickness","湖边湿气让身体不太舒服。",{health:-8,energy:-4})],itemPool:[drop("glass-stone","月光玻璃石","souvenir",40,1),drop("reed-whistle","芦苇哨","resource",30,3),drop("lake-snack","湖畔小鱼干","food",30,2)]},
  {id:"coast",name:"潮汐小镇",housingCost:40,startingStats:stats(79,76,66,64,65,11),shopLevel:4,medicalLevel:3,dailyCost:8,incomeMultiplier:1.05,travelMultiplier:.9,summary:"稀有掉落丰富，天气风险波动最大",x:80,y:74,resources:["贝壳","海盐","舶来品"],numericYield:yieldOf([3,10],[3,8],[1,6],.58),eventTable:[event("coast-tide","看潮涨落",27,"calm","在安全的高处看了一会潮水。",{mood:5}),event("coast-market","码头交易",31,"opportunity","帮忙整理货物，得到一点报酬。",{energy:-3,activity:3},7),event("coast-crate","漂来木箱",25,"discovery","潮水送来一个贴着远方标签的小木箱。",{experience:7,mood:4},0,2,{experience:2,energy:-1},[],follow("coast-letter","远方来信",.55,"discovery","木箱夹层里的信提到另一个港口和旧航线。",{experience:7,mood:3})),event("coast-rock","礁石擦伤",9,"accident","探索礁石时留下小擦伤。",{health:-7}),event("coast-storm","海风着凉",8,"sickness","突来的海风让身体受凉。",{health:-9,energy:-5})],itemPool:[drop("shell","潮纹贝壳","souvenir",38,1),drop("sea-salt","海盐袋","resource",32,3),drop("foreign-charm","舶来护符","outfit",30,4)]},
];

const BASE_PLACE_EVENT_TRIGGER_CHANCES:Readonly<Record<PlaceId,TriggerChance>>={forest:{day:.72,night:.48},hill:{day:.55,night:.35},station:{day:.64,night:.52},city:{day:.70,night:.68},lake:{day:.68,night:.46},coast:{day:.66,night:.58}};

export const ROUTE_EVENT_TABLE:readonly WeightedEvent[]=[
  event("route-calm","平安赶路",36,"calm","一路平稳，按原计划前进。",{mood:1},0,1,{},[]),
  event("route-fatigue","旅途疲劳",26,"sickness","长时间移动消耗了体力。",{energy:-10,activity:-3},0,2,{energy:-5,satiety:-4},["meal","station-bento","trip-kit"]),
  event("route-lost","迷路",14,"accident","路线标记变得模糊，需要重新辨认方向。",{energy:-6,satiety:-5},0,2,{mood:-4},["old-book","ticket-stub"],follow("route-late-sign","迟到的路标",.36,"discovery","绕路后找到一块旧路标，可能修正以后的判断。",{experience:5,mood:2})),
  event("route-storm","暴雨滞留",12,"sickness","暴雨使行程暂时受阻。",{mood:-4,energy:-3},0,2,{energy:-2,mood:-2},["raincoat"]),
  event("route-secret","发现秘境",12,"discovery","绕行时意外发现一处安静秘境。",{experience:8,mood:6},0,2,{experience:2},[],follow("route-secret-echo","秘境回声",.44,"discovery","离开后，宠物想起了秘境里未看清的另一条岔路。",{experience:6,mood:3})),
];

const BASE_ROUTE_EVENT_TRIGGER_CHANCES:Readonly<Record<string,TriggerChance>>={"forest-station":{day:.42,night:.54},"hill-station":{day:.30,night:.38},"station-city":{day:.34,night:.42},"station-lake":{day:.46,night:.58},"station-coast":{day:.50,night:.64},"forest-lake":{day:.58,night:.70},"city-coast":{day:.40,night:.52},"lake-coast":{day:.52,night:.66}};

const BASE_ROUTES:readonly RouteEdge[]=[
  {id:"forest-station",from:"forest",to:"station",distance:42,travelTurns:1,transportCost:12,lodgingCost:0,foodCost:5,emergencyReserve:8,risk:.22,resources:["松果","车票"]},
  {id:"hill-station",from:"hill",to:"station",distance:28,travelTurns:1,transportCost:9,lodgingCost:0,foodCost:4,emergencyReserve:7,risk:.12,resources:["香草"]},
  {id:"station-city",from:"station",to:"city",distance:36,travelTurns:1,transportCost:13,lodgingCost:8,foodCost:6,emergencyReserve:10,risk:.09,resources:["优惠券"]},
  {id:"station-lake",from:"station",to:"lake",distance:55,travelTurns:1,transportCost:15,lodgingCost:8,foodCost:7,emergencyReserve:10,risk:.32,resources:["玻璃石","水产"]},
  {id:"station-coast",from:"station",to:"coast",distance:72,travelTurns:2,transportCost:18,lodgingCost:10,foodCost:8,emergencyReserve:12,risk:.24,resources:["贝壳","海盐"]},
  {id:"forest-lake",from:"forest",to:"lake",distance:30,travelTurns:1,transportCost:6,lodgingCost:5,foodCost:7,emergencyReserve:10,risk:.4,resources:["药草","玻璃石"]},
  {id:"city-coast",from:"city",to:"coast",distance:50,travelTurns:1,transportCost:17,lodgingCost:9,foodCost:7,emergencyReserve:11,risk:.18,resources:["舶来品"]},
  {id:"lake-coast",from:"lake",to:"coast",distance:64,travelTurns:2,transportCost:14,lodgingCost:9,foodCost:8,emergencyReserve:12,risk:.3,resources:["贝壳","玻璃石"]},
];

const BASE_ITEM_CATALOG:readonly ItemDefinition[]=[
  {id:"snack",name:"云朵松饼",kind:"food",basePrice:5,minLevel:1,uses:2},{id:"meal",name:"营养便当",kind:"food",basePrice:9,minLevel:2,uses:3},
  {id:"medicine",name:"温和药剂",kind:"medicine",basePrice:14,minLevel:2,uses:3},{id:"bandage",name:"应急绷带",kind:"medicine",basePrice:8,minLevel:1,uses:2},
  {id:"trip-kit",name:"旅行用品包",kind:"trip",basePrice:16,minLevel:2,uses:4},{id:"raincoat",name:"轻便雨衣",kind:"trip",basePrice:11,minLevel:3,uses:5},
  {id:"scarf",name:"杏色围巾",kind:"outfit",basePrice:10,minLevel:2,uses:8},
];

const BASE_CONTENT_PACK:WorldContentPack={
  id:"base-world",
  name:"小窝巡游 · 原始地区",
  places:BASE_PLACES,
  routes:BASE_ROUTES,
  items:BASE_ITEM_CATALOG,
  placeEventTriggerChances:BASE_PLACE_EVENT_TRIGGER_CHANCES,
  routeEventTriggerChances:BASE_ROUTE_EVENT_TRIGGER_CHANCES,
};

export const CONTENT_PACKS:readonly WorldContentPack[]=[BASE_CONTENT_PACK,FRONTIER_EXPANSION];
export const PLACES:readonly PlaceNode[]=CONTENT_PACKS.flatMap(pack=>pack.places);
export const ROUTES:readonly RouteEdge[]=CONTENT_PACKS.flatMap(pack=>pack.routes);
export const ITEM_CATALOG:readonly ItemDefinition[]=CONTENT_PACKS.flatMap(pack=>pack.items);
export const PLACE_EVENT_TRIGGER_CHANCES:Readonly<Record<PlaceId,TriggerChance>>=Object.assign({},...CONTENT_PACKS.map(pack=>pack.placeEventTriggerChances));
export const ROUTE_EVENT_TRIGGER_CHANCES:Readonly<Record<string,TriggerChance>>=Object.assign({},...CONTENT_PACKS.map(pack=>pack.routeEventTriggerChances));

assertValidWorldContent({places:PLACES,routes:ROUTES,items:ITEM_CATALOG,placeEventTriggerChances:PLACE_EVENT_TRIGGER_CHANCES,routeEventTriggerChances:ROUTE_EVENT_TRIGGER_CHANCES});

export const hash=(seed:number)=>((seed*1103515245+12345)>>>0)/2**32;
export function createShop(placeId:PlaceId,cycle:number,seed:number):ShopOffer[]{const place=getPlace(placeId);return ITEM_CATALOG.filter((item,index)=>item.minLevel<=place.shopLevel&&(["snack","bandage","trip-kit"].includes(item.id)||hash(seed+cycle*37+index*101)>.18)).map((item,index)=>{const fluctuation=.82+hash(seed+cycle*73+index*41)*.42;const computed=Math.max(2,Math.round(item.basePrice*fluctuation*(1.1-place.shopLevel*.025)));return {itemId:item.id,name:item.name,kind:item.kind,basePrice:item.basePrice,uses:item.uses,price:item.id==="bandage"?Math.min(8,computed):computed,stock:1+Math.floor(hash(seed+cycle*19+index*67)*Math.min(5,place.shopLevel+1))};});}
export function getPlace(id:PlaceId){const place=PLACES.find(p=>p.id===id);if(!place)throw new Error(`Unknown place ${id}`);return place;}
export function getRoute(id:string){const route=ROUTES.find(r=>r.id===id);if(!route)throw new Error(`Unknown route ${id}`);return route;}
export function routesFrom(id:PlaceId){return ROUTES.filter(route=>route.from===id||route.to===id);}
export function otherEnd(route:RouteEdge,id:PlaceId):PlaceId{return route.from===id?route.to:route.from;}
export function routeCost(route:RouteEdge,homeId:PlaceId){return Math.round((route.transportCost+route.lodgingCost+route.foodCost)*getPlace(homeId).travelMultiplier+route.emergencyReserve);}
export function clockFor(turn:number){const day=Math.floor((turn-1)/2)+1;return {turn,day,month:Math.floor((day-1)/10)+1,period:(turn%2===1?"昼":"夜") as "昼"|"夜"};}
export function seasonFor(month:number):Season{return (["春","夏","秋","冬"] as Season[])[Math.floor((month-1)/2)%4];}
export function weatherFor(seed:number,turn:number,placeId:PlaceId|null):Weather{const roll=hash(seed+turn*97+(placeId?PLACES.findIndex(p=>p.id===placeId)*211:0));const table:Weather[]=["晴","晴","多云","雨","风","雾","暴风雨"];return table[Math.min(table.length-1,Math.floor(roll*table.length))];}
