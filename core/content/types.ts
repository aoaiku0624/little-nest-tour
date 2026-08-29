import type { ItemDefinition, PlaceId, PlaceNode, RouteEdge, TriggerChance } from "../model";

export interface WorldContentPack {
  id: string;
  name: string;
  places: readonly PlaceNode[];
  routes: readonly RouteEdge[];
  items: readonly ItemDefinition[];
  placeEventTriggerChances: Readonly<Record<PlaceId, TriggerChance>>;
  routeEventTriggerChances: Readonly<Record<string, TriggerChance>>;
}
