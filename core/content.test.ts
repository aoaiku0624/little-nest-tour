import assert from "node:assert/strict";
import test from "node:test";
import { validateWorldContent } from "./content/validate";
import { CONTENT_PACKS, ITEM_CATALOG, PLACE_EVENT_TRIGGER_CHANCES, PLACES, ROUTE_EVENT_TRIGGER_CHANCES, ROUTES } from "./world";

test("内容包可独立追加，完整世界通过自动契约校验",()=>{
  assert.deepEqual(validateWorldContent({places:PLACES,routes:ROUTES,items:ITEM_CATALOG,placeEventTriggerChances:PLACE_EVENT_TRIGGER_CHANCES,routeEventTriggerChances:ROUTE_EVENT_TRIGGER_CHANCES}),[]);
  assert.equal(CONTENT_PACKS.length,2);
  assert.equal(PLACES.length,17);
  assert.equal(ROUTES.length,28);
  assert.equal(ITEM_CATALOG.length,17);
});

test("城镇扩展形成密集交通，偏僻扩展保留稀疏分支",()=>{
  const degree=(id:string)=>ROUTES.filter(route=>route.from===id||route.to===id).length;
  const hubs=["ginkgo-quarter","starlight-market","riverside-terrace","white-harbor","saltwind-alley"];
  const remote=["moss-valley","cedar-watch","bell-meadow","cloud-pass","reed-bay","moon-marsh"];
  assert.ok(hubs.every(id=>degree(id)>=3));
  assert.ok(remote.every(id=>degree(id)<=2));
  assert.ok(remote.length>hubs.length);
});

test("新增地点的事件、道具与昼夜概率成套存在",()=>{
  const added=CONTENT_PACKS[1];
  const remote=new Set(["moss-valley","cedar-watch","bell-meadow","cloud-pass","reed-bay","moon-marsh"]);
  assert.ok(added.places.every(place=>place.eventTable.length===5&&place.itemPool.length>=3));
  assert.ok(added.places.filter(place=>remote.has(place.id)).every(place=>place.itemPool.length===4&&place.itemPool.some(item=>item.interaction?.kind==="love-letter")));
  assert.ok(added.places.filter(place=>!remote.has(place.id)).every(place=>place.itemPool.length===3));
  assert.ok(added.places.every(place=>place.eventTable.some(event=>event.followUp)));
  assert.ok(added.places.every(place=>added.placeEventTriggerChances[place.id]));
  assert.ok(added.routes.every(route=>added.routeEventTriggerChances[route.id]));
});

test("坏内容只跑轻量校验就能定位，无需启动整套游戏",()=>{
  const errors=validateWorldContent({places:PLACES,routes:[...ROUTES,{...ROUTES[0],id:"broken-route",to:"missing-place"}],items:ITEM_CATALOG,placeEventTriggerChances:PLACE_EVENT_TRIGGER_CHANCES,routeEventTriggerChances:{...ROUTE_EVENT_TRIGGER_CHANCES,"broken-route":{day:.2,night:.3}}});
  assert.ok(errors.some(error=>error.includes("路线端点无效：broken-route")));
});
