import { createInitialState, migrateState } from "./engine";
import type { GameState } from "./model";

export const STORAGE_KEY="little-nest-state-v4";
const PREVIOUS_KEY="little-nest-state-v3";
const LEGACY_KEY="little-nest-state-v1";
const OLDER_KEY="little-nest-state-v2";

export interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem?(key:string):void; }
export function scopedStorage(storage:StorageLike,scope:string):StorageLike{return {getItem:(key)=>storage.getItem(`${scope}:${key}`),setItem:(key,value)=>storage.setItem(`${scope}:${key}`,value),removeItem:(key)=>storage.removeItem?.(`${scope}:${key}`)};}

export function loadGame(storage:StorageLike,now=Date.now()):GameState{
  try{
    const current=storage.getItem(STORAGE_KEY);
    if(current)return migrateState(JSON.parse(current),now);
    const previous=storage.getItem(PREVIOUS_KEY);
    if(previous){const migrated=migrateState(JSON.parse(previous),now);storage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated;}
    const older=storage.getItem(OLDER_KEY);
    if(older){const migrated=migrateState(JSON.parse(older),now);storage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated;}
    const legacy=storage.getItem(LEGACY_KEY);
    if(legacy){const migrated=migrateState(JSON.parse(legacy),now);storage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated;}
  }catch{/* malformed legacy data falls back to a fresh local state */}
  return createInitialState(now);
}
export function saveGame(storage:StorageLike,state:GameState){storage.setItem(STORAGE_KEY,JSON.stringify(state));}
