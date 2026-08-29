import type { ItemDefinition, PlaceNode, RouteEdge, TriggerChance } from "../model";

export interface WorldContent {
  places:readonly PlaceNode[];
  routes:readonly RouteEdge[];
  items:readonly ItemDefinition[];
  placeEventTriggerChances:Readonly<Record<string,TriggerChance>>;
  routeEventTriggerChances:Readonly<Record<string,TriggerChance>>;
}

const duplicates=(values:readonly string[])=>values.filter((value,index)=>values.indexOf(value)!==index);
const chanceValid=(chance:TriggerChance|undefined)=>Boolean(chance&&chance.day>=0&&chance.day<=1&&chance.night>=0&&chance.night<=1);

export function validateWorldContent(content:WorldContent):string[]{
  const errors:string[]=[];
  const placeIds=content.places.map(place=>place.id);
  const routeIds=content.routes.map(route=>route.id);
  const itemIds=content.items.map(item=>item.id);
  const knownItems=new Set([...itemIds,...content.places.flatMap(place=>place.itemPool.map(item=>item.itemId))]);
  for(const id of duplicates(placeIds))errors.push(`地点 id 重复：${id}`);
  for(const id of duplicates(routeIds))errors.push(`路线 id 重复：${id}`);
  for(const id of duplicates(itemIds))errors.push(`商店道具 id 重复：${id}`);
  const placeSet=new Set(placeIds);
  for(const place of content.places){
    if(place.x<0||place.x>100||place.y<0||place.y>100)errors.push(`地点坐标越界：${place.id}`);
    if(place.eventTable.reduce((sum,event)=>sum+event.weight,0)!==100)errors.push(`地点事件权重不等于 100：${place.id}`);
    if(place.itemPool.some(item=>item.weight<=0||item.uses<=0))errors.push(`地点掉落无效：${place.id}`);
    if(!chanceValid(content.placeEventTriggerChances[place.id]))errors.push(`地点缺少昼夜触发率：${place.id}`);
    for(const event of place.eventTable){
      if(event.durationTurns<1||event.responses.length<2)errors.push(`事件契约无效：${event.id}`);
      for(const itemId of event.manualEndItemIds)if(!knownItems.has(itemId))errors.push(`事件解除道具不存在：${event.id} -> ${itemId}`);
    }
  }
  for(const route of content.routes){
    if(!placeSet.has(route.from)||!placeSet.has(route.to)||route.from===route.to)errors.push(`路线端点无效：${route.id}`);
    if(route.distance<=0||route.travelTurns<1||route.risk<0||route.risk>1)errors.push(`路线数值无效：${route.id}`);
    if(!chanceValid(content.routeEventTriggerChances[route.id]))errors.push(`路线缺少昼夜触发率：${route.id}`);
  }
  for(const place of content.places)if(!content.routes.some(route=>route.from===place.id||route.to===place.id))errors.push(`地点没有路线：${place.id}`);
  for(const item of content.items)if(item.basePrice<=0||item.uses<=0||item.minLevel<1)errors.push(`商店道具无效：${item.id}`);
  return [...new Set(errors)];
}

export function assertValidWorldContent(content:WorldContent){
  const errors=validateWorldContent(content);
  if(errors.length)throw new Error(`世界内容校验失败：\n${errors.join("\n")}`);
}
