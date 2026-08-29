import type { ItemDrop, ItemKind, PlaceNode, RouteEdge, WeightedEvent } from "../model";
import type { WorldContentPack } from "./types";

const stats=(health:number,mood:number,energy:number,satiety:number,activity:number,experience:number)=>({health,mood,energy,satiety,activity,experience});
const responses:Record<WeightedEvent["kind"],WeightedEvent["responses"]>={
  calm:[{id:"linger",label:"多留一会",description:"安静恢复",statDelta:{mood:4,energy:2},moneyDelta:0,durationDelta:-1},{id:"record",label:"记录细节",description:"转化为成长",statDelta:{experience:4},moneyDelta:0,durationDelta:-1}],
  opportunity:[{id:"steady",label:"稳妥完成",description:"领取普通报酬",statDelta:{energy:-2},moneyDelta:4,durationDelta:-1},{id:"push",label:"抓住机会",description:"多投入换取更多",statDelta:{energy:-6,activity:2},moneyDelta:8,durationDelta:-1}],
  discovery:[{id:"inspect",label:"深入调查",description:"消耗精力追踪线索",statDelta:{experience:6,energy:-3},moneyDelta:0,durationDelta:-1},{id:"preserve",label:"保护现场",description:"保留线索稳定心情",statDelta:{mood:4,experience:2},moneyDelta:0,durationDelta:-1}],
  accident:[{id:"rest-care",label:"减少活动",description:"休息缩短影响",statDelta:{health:3,activity:-3},moneyDelta:0,durationDelta:-1},{id:"observe-injury",label:"继续观察",description:"暂时保留物资",statDelta:{mood:1},moneyDelta:0,durationDelta:0}],
  sickness:[{id:"bed-rest",label:"严格休息",description:"休息缩短影响",statDelta:{energy:5,activity:-4},moneyDelta:0,durationDelta:-1},{id:"light-routine",label:"维持轻作息",description:"保持心情",statDelta:{mood:3},moneyDelta:0,durationDelta:0}],
};
const event=(id:string,name:string,weight:number,kind:WeightedEvent["kind"],text:string,statDelta:WeightedEvent["statDelta"],moneyDelta=0,manualEndItemIds:string[]=[]):WeightedEvent=>({id,name,weight,kind,text,statDelta,moneyDelta,durationTurns:kind==="calm"?1:kind==="opportunity"||kind==="discovery"?2:3,perTurnDelta:kind==="calm"?{mood:1}:kind==="opportunity"?{energy:-1}:kind==="discovery"?{experience:2,energy:-1}:kind==="accident"?{health:-3,activity:-2}:{health:-2,energy:-3},manualEndItemIds,responses:responses[kind],...(kind==="discovery"?{followUp:{id:`${id}-follow`,name:`${name}的后续线索`,chance:.48,kind:"discovery",text:"离开以后，线索又指向了更深的一层。",statDelta:{experience:5,mood:2},durationTurns:2,perTurnDelta:{experience:1},manualEndItemIds:[],responses:responses.discovery}}:{})});
const drop=(itemId:string,name:string,kind:ItemKind,weight:number,uses:number,interaction?:ItemDrop["interaction"]):ItemDrop=>({itemId,name,kind,weight,uses,interaction});

interface PlaceSeed {
  id:string; name:string; x:number; y:number; housingCost:number; shopLevel:number; medicalLevel:number;
  dailyCost:number; incomeMultiplier:number; travelMultiplier:number; summary:string; resources:string[];
  health:number; mood:number; energy:number; satiety:number; activity:number; experience:number;
  yieldMoney:[number,number]; yieldExperience:[number,number]; yieldMood:[number,number]; itemChance:number;
  calm:string; work:string; discovery:string; accident:string; sickness:string; supportItem:string;
  drops:readonly [string,string,ItemKind,number,number,ItemDrop["interaction"]?][];
}
const place=(seed:PlaceSeed):PlaceNode=>({
  id:seed.id,name:seed.name,x:seed.x,y:seed.y,housingCost:seed.housingCost,shopLevel:seed.shopLevel,medicalLevel:seed.medicalLevel,dailyCost:seed.dailyCost,incomeMultiplier:seed.incomeMultiplier,travelMultiplier:seed.travelMultiplier,summary:seed.summary,resources:seed.resources,
  startingStats:stats(seed.health,seed.mood,seed.energy,seed.satiety,seed.activity,seed.experience),
  numericYield:{money:seed.yieldMoney,experience:seed.yieldExperience,mood:seed.yieldMood,baseItemChance:seed.itemChance},
  eventTable:[
    event(`${seed.id}-calm`,seed.calm,30,"calm",`在${seed.name}安静待了一阵。`,{mood:5,energy:3}),
    event(`${seed.id}-work`,seed.work,28,"opportunity",`在${seed.name}接到一件当地委托。`,{activity:3},6),
    event(`${seed.id}-discovery`,seed.discovery,22,"discovery",`在${seed.name}发现了一条新线索。`,{experience:6,mood:3}),
    event(`${seed.id}-accident`,seed.accident,12,"accident",`探索${seed.name}时遇到小意外。`,{health:-7,energy:-2},0,["bandage",seed.supportItem]),
    event(`${seed.id}-sickness`,seed.sickness,8,"sickness",`${seed.name}的环境让身体有些吃不消。`,{health:-7,energy:-5},0,["medicine",seed.supportItem]),
  ],
  itemPool:seed.drops.map(item=>drop(...item)),
});
const route=(id:string,from:string,to:string,distance:number,risk:number,transportCost:number,resources:string[],travelTurns=1):RouteEdge=>({id,from,to,distance,risk,travelTurns,transportCost,lodgingCost:distance>30?6:0,foodCost:Math.max(3,Math.round(distance/8)),emergencyReserve:Math.max(6,Math.round(distance/5)),resources});

const places:readonly PlaceNode[]=[
  place({id:"moss-valley",name:"苔光谷",x:5,y:10,housingCost:16,shopLevel:1,medicalLevel:1,dailyCost:4,incomeMultiplier:.78,travelMultiplier:1.24,summary:"幽深潮湿，药材与发光菌丰富，交通极少",resources:["苔茶","发光菌","溪石"],health:74,mood:82,energy:72,satiety:54,activity:68,experience:10,yieldMoney:[1,4],yieldExperience:[3,8],yieldMood:[3,7],itemChance:.72,calm:"苔谷听水",work:"采集发光菌",discovery:"石缝旧刻",accident:"湿石滑落",sickness:"谷雾寒气",supportItem:"moss-tea",drops:[["moss-tea","苔叶暖茶","food",30,2],["glow-spore","微光菌囊","resource",28,2],["stream-stone","溪纹石","souvenir",24,1],["moss-letter","苔叶间的信","souvenir",18,1,{kind:"love-letter",titleTemplate:"{playerName}藏在苔叶下的情书",bodyTemplate:"{petName}，这里的光很小，可我第一眼想到的还是你。——{playerName}"}]]}),
  place({id:"cedar-watch",name:"杉顶瞭望台",x:4,y:36,housingCost:18,shopLevel:1,medicalLevel:1,dailyCost:4,incomeMultiplier:.82,travelMultiplier:1.2,summary:"高处视野辽阔，风险与迷雾事件明显",resources:["松脂","旧望远镜","风羽"],health:73,mood:79,energy:70,satiety:56,activity:72,experience:12,yieldMoney:[1,5],yieldExperience:[4,9],yieldMood:[2,6],itemChance:.68,calm:"杉顶看云",work:"维护观测架",discovery:"远处灯火",accident:"木梯打滑",sickness:"高台风寒",supportItem:"wind-cloak",drops:[["resin-tin","松脂小罐","resource",30,3],["old-lens","旧镜片","souvenir",28,1],["wind-cloak","薄风斗篷","outfit",24,4],["cedar-letter","望远镜筒里的信","souvenir",18,1,{kind:"love-letter",titleTemplate:"{playerName}从杉顶寄来的情书",bodyTemplate:"{petName}，站得再高，最想看的方向也始终是你。——{playerName}"}]]}),
  place({id:"bell-meadow",name:"铃草牧场",x:27,y:2,housingCost:21,shopLevel:2,medicalLevel:1,dailyCost:5,incomeMultiplier:.9,travelMultiplier:1.08,summary:"安静开阔，食物稳定，但入夜后交通中断",resources:["羊乳","铃草","软毛"],health:82,mood:80,energy:74,satiety:65,activity:62,experience:9,yieldMoney:[2,7],yieldExperience:[2,6],yieldMood:[3,7],itemChance:.6,calm:"铃草午睡",work:"帮忙照看羊群",discovery:"牧铃暗号",accident:"草坡扭伤",sickness:"夜露受凉",supportItem:"goat-cheese",drops:[["goat-cheese","山羊奶酪","food",32,2],["bell-grass","铃草束","medicine",26,2],["soft-wool","云团软毛","resource",24,3],["meadow-letter","系在牧铃上的信","souvenir",18,1,{kind:"love-letter",titleTemplate:"{playerName}系在牧铃上的情书",bodyTemplate:"每次风吹响铃草，我都想叫一声{petName}。——{playerName}"}]]}),
  place({id:"cloud-pass",name:"云脊古道",x:45,y:2,housingCost:14,shopLevel:1,medicalLevel:0,dailyCost:4,incomeMultiplier:.72,travelMultiplier:1.3,summary:"最偏远的山路节点，成长与稀有发现高，风险也高",resources:["雪线草","古路牌","云晶"],health:72,mood:76,energy:68,satiety:52,activity:74,experience:15,yieldMoney:[0,4],yieldExperience:[5,11],yieldMood:[1,6],itemChance:.75,calm:"云海歇脚",work:"修补古道路标",discovery:"雪线石门",accident:"碎石滑坡",sickness:"高岭失温",supportItem:"trail-cleats",drops:[["snow-herb","雪线草","medicine",30,2],["trail-cleats","轻便冰爪","trip",28,4],["cloud-crystal","云纹晶片","souvenir",24,1],["cloud-letter","压在古路牌后的信","souvenir",18,1,{kind:"love-letter",titleTemplate:"{playerName}留在云脊的情书",bodyTemplate:"路很远，风也很冷，可我会把{petName}平安带回家。——{playerName}"}]]}),
  place({id:"reed-bay",name:"芦灯浅湾",x:7,y:68,housingCost:22,shopLevel:1,medicalLevel:1,dailyCost:5,incomeMultiplier:.84,travelMultiplier:1.16,summary:"浅水与芦苇交错，恢复道具多，路线很少",resources:["芦芯","小鱼","水草药"],health:77,mood:85,energy:72,satiety:58,activity:60,experience:11,yieldMoney:[1,5],yieldExperience:[3,8],yieldMood:[4,9],itemChance:.7,calm:"芦灯漂流",work:"编织芦席",discovery:"浅湾旧舟",accident:"陷入软泥",sickness:"水汽侵寒",supportItem:"marsh-salve",drops:[["reed-mat","芦编软席","outfit",28,4],["bay-minnow","浅湾小鱼干","food",28,2],["marsh-salve","水草药膏","medicine",26,3],["reed-letter","塞进芦苇哨里的信","souvenir",18,1,{kind:"love-letter",titleTemplate:"{playerName}写在芦灯下的情书",bodyTemplate:"{petName}，水面漂走了好多盏灯，我只许愿你一直在我身边。——{playerName}"}]]}),
  place({id:"moon-marsh",name:"月影湿地",x:8,y:94,housingCost:15,shopLevel:1,medicalLevel:0,dailyCost:4,incomeMultiplier:.75,travelMultiplier:1.28,summary:"夜间秘境多，萤光收藏稀有，湿地风险最高",resources:["月莲","萤灯","黑泥"],health:71,mood:86,energy:66,satiety:50,activity:68,experience:16,yieldMoney:[0,4],yieldExperience:[5,12],yieldMood:[4,10],itemChance:.78,calm:"月影听蛙",work:"采集月莲",discovery:"萤群引路",accident:"深泥失足",sickness:"湿地热病",supportItem:"firefly-lantern",drops:[["moon-lotus","月莲药瓣","medicine",29,2],["firefly-lantern","萤火提灯","trip",29,5],["marsh-pearl","湿地黑珍珠","souvenir",24,1],["moon-letter","沾着萤光的信","souvenir",18,1,{kind:"love-letter",titleTemplate:"{playerName}借月光写的情书",bodyTemplate:"萤火会熄，月亮会落，{playerName}喜欢{petName}这件事不会。"}]]}),
  place({id:"ginkgo-quarter",name:"银杏旧街",x:61,y:42,housingCost:42,shopLevel:3,medicalLevel:3,dailyCost:7,incomeMultiplier:1.03,travelMultiplier:.82,summary:"车站、城区和海路之间的换乘街区",resources:["纸地图","旧招牌","芝麻饼"],health:80,mood:72,energy:68,satiety:66,activity:60,experience:12,yieldMoney:[3,9],yieldExperience:[2,7],yieldMood:[1,5],itemChance:.5,calm:"旧街慢行",work:"整理换乘地图",discovery:"封存站牌",accident:"巷口碰撞",sickness:"站风受凉",supportItem:"folding-map",drops:[["folding-map","折叠交通图","trip",36,4],["sesame-cake","旧街芝麻饼","food",36,2],["enamel-sign","珐琅站牌","souvenir",28,1]]}),
  place({id:"starlight-market",name:"星桥夜市",x:69,y:10,housingCost:48,shopLevel:5,medicalLevel:4,dailyCost:9,incomeMultiplier:1.18,travelMultiplier:.86,summary:"夜间收益和商店最活跃，交通四通八达",resources:["夜宵","灯牌","代币"],health:77,mood:75,energy:62,satiety:72,activity:64,experience:14,yieldMoney:[5,13],yieldExperience:[2,7],yieldMood:[1,6],itemChance:.48,calm:"桥下看灯",work:"夜市临时摊位",discovery:"暗号菜单",accident:"人潮擦碰",sickness:"熬夜疲劳",supportItem:"warm-cocoa",drops:[["warm-cocoa","暖夜可可","food",38,2],["market-token","星桥代币","resource",34,3],["light-pin","灯牌徽章","souvenir",28,1]]}),
  place({id:"riverside-terrace",name:"河湾台地",x:93,y:35,housingCost:58,shopLevel:5,medicalLevel:5,dailyCost:11,incomeMultiplier:1.22,travelMultiplier:.84,summary:"城区生活与港口物流交汇，医疗和交通完善",resources:["草本汽水","水运票","河灯"],health:80,mood:74,energy:66,satiety:68,activity:58,experience:15,yieldMoney:[5,12],yieldExperience:[3,8],yieldMood:[1,6],itemChance:.46,calm:"河风晚餐",work:"水运调度",discovery:"旧闸暗室",accident:"湿阶滑倒",sickness:"河风头痛",supportItem:"herbal-soda",drops:[["herbal-soda","草本汽水","food",36,2],["ferry-pass","水运通票","trip",34,4],["river-lamp","袖珍河灯","souvenir",30,1]]}),
  place({id:"white-harbor",name:"白帆港",x:94,y:63,housingCost:46,shopLevel:4,medicalLevel:3,dailyCost:9,incomeMultiplier:1.12,travelMultiplier:.82,summary:"连接城区与潮汐小镇的海陆换乘港",resources:["航海饼","黄铜件","船票"],health:78,mood:77,energy:66,satiety:66,activity:68,experience:15,yieldMoney:[4,11],yieldExperience:[3,9],yieldMood:[2,7],itemChance:.58,calm:"看白帆归港",work:"帮忙清点货箱",discovery:"旧航线图",accident:"缆绳擦伤",sickness:"海雾晕船",supportItem:"brass-compass",drops:[["sailor-biscuit","航海硬饼","food",36,3],["brass-compass","黄铜罗盘","trip",34,5],["white-sail","白帆布片","souvenir",30,1]]}),
  place({id:"saltwind-alley",name:"盐风旧巷",x:68,y:92,housingCost:34,shopLevel:3,medicalLevel:2,dailyCost:7,incomeMultiplier:.98,travelMultiplier:.94,summary:"小镇旧生活保存完整，物价温和、路线不少",resources:["盐糖","蓝花砖","香料"],health:79,mood:81,energy:68,satiety:67,activity:59,experience:13,yieldMoney:[3,9],yieldExperience:[3,8],yieldMood:[2,8],itemChance:.62,calm:"旧巷晒太阳",work:"替香料铺送货",discovery:"蓝砖密记",accident:"石路绊倒",sickness:"咸风咳嗽",supportItem:"salt-candy",drops:[["salt-candy","海盐硬糖","food",38,3],["blue-tile","蓝花旧砖","souvenir",32,1],["spice-pouch","港口香料包","resource",30,3]]}),
];

const routes:readonly RouteEdge[]=[
  route("forest-moss-valley","forest","moss-valley",18,.32,5,["药草","发光菌"]),
  route("forest-cedar-watch","forest","cedar-watch",24,.36,6,["松脂","风羽"]),
  route("hill-bell-meadow","hill","bell-meadow",16,.16,5,["羊乳","铃草"]),
  route("hill-cloud-pass","hill","cloud-pass",26,.38,7,["雪线草","云晶"]),
  route("cloud-pass-ginkgo-quarter","cloud-pass","ginkgo-quarter",38,.33,11,["古路牌","纸地图"]),
  route("lake-reed-bay","lake","reed-bay",14,.3,4,["芦芯","水草药"]),
  route("lake-moon-marsh","lake","moon-marsh",28,.46,6,["月莲","萤灯"]),
  route("station-ginkgo-quarter","station","ginkgo-quarter",18,.08,6,["车票","纸地图"]),
  route("ginkgo-quarter-city","ginkgo-quarter","city",22,.07,7,["电子券","旧招牌"]),
  route("ginkgo-quarter-starlight-market","ginkgo-quarter","starlight-market",20,.09,7,["代币","夜宵"]),
  route("ginkgo-quarter-riverside-terrace","ginkgo-quarter","riverside-terrace",24,.08,8,["水运票","纸地图"]),
  route("city-starlight-market","city","starlight-market",12,.06,5,["电子券","灯牌"]),
  route("city-riverside-terrace","city","riverside-terrace",15,.05,5,["药品","水运票"]),
  route("starlight-market-riverside-terrace","starlight-market","riverside-terrace",10,.07,4,["夜宵","河灯"]),
  route("starlight-market-saltwind-alley","starlight-market","saltwind-alley",32,.14,10,["香料","代币"]),
  route("riverside-terrace-white-harbor","riverside-terrace","white-harbor",34,.11,11,["船票","草本汽水"]),
  route("city-white-harbor","city","white-harbor",38,.12,12,["药品","黄铜件"]),
  route("coast-white-harbor","coast","white-harbor",14,.1,5,["贝壳","船票"]),
  route("coast-saltwind-alley","coast","saltwind-alley",12,.09,4,["海盐","香料"]),
  route("white-harbor-saltwind-alley","white-harbor","saltwind-alley",9,.06,4,["盐糖","航海饼"]),
];

const placeEventTriggerChances=Object.fromEntries(places.map(place=>[place.id,place.id==="moon-marsh"?{day:.48,night:.82}:place.id==="cloud-pass"?{day:.64,night:.4}:["moss-valley","cedar-watch","reed-bay"].includes(place.id)?{day:.65,night:.53}:{day:.67,night:.64}]));
const routeEventTriggerChances=Object.fromEntries(routes.map(item=>[item.id,{day:Math.min(.7,.24+item.risk),night:Math.min(.82,.34+item.risk)}]));

export const FRONTIER_EXPANSION:WorldContentPack={
  id:"frontier-expansion-01",
  name:"枢纽与秘境 · 第一批",
  places,
  routes,
  items:[
    {id:"moss-tea",name:"苔叶暖茶",kind:"food",basePrice:8,minLevel:1,uses:2},
    {id:"wind-cloak",name:"薄风斗篷",kind:"outfit",basePrice:13,minLevel:2,uses:5},
    {id:"trail-cleats",name:"轻便冰爪",kind:"trip",basePrice:15,minLevel:2,uses:5},
    {id:"marsh-salve",name:"水草药膏",kind:"medicine",basePrice:12,minLevel:2,uses:3},
    {id:"firefly-lantern",name:"萤火提灯",kind:"trip",basePrice:17,minLevel:3,uses:6},
    {id:"folding-map",name:"折叠交通图",kind:"trip",basePrice:10,minLevel:2,uses:4},
    {id:"warm-cocoa",name:"暖夜可可",kind:"food",basePrice:7,minLevel:2,uses:2},
    {id:"herbal-soda",name:"草本汽水",kind:"food",basePrice:8,minLevel:3,uses:2},
    {id:"brass-compass",name:"黄铜罗盘",kind:"trip",basePrice:18,minLevel:4,uses:6},
    {id:"salt-candy",name:"海盐硬糖",kind:"food",basePrice:6,minLevel:2,uses:3},
  ],
  placeEventTriggerChances,
  routeEventTriggerChances,
};
