import layout from './fixtures/sfCityLayout.json';
import {useStore} from '../state/store';
import type {Entity} from './api';
import type {CityLayout,Snapshot} from './types';
// Geometry is decorative. Simulated buildings use real backend institution IDs.
export function getLiveLayout():CityLayout {
 const bound=bindEntities(layout.buildings as CityLayout['buildings']);
 return {...(layout as unknown as CityLayout),buildings:(layout.buildings as CityLayout['buildings']).map(b=>{
  const entity=bound.get(b.id);
  return entity?{...b,id:entity.id,name:entity.name}:{...b,id:'scenery-'+b.id};
 })};
}
export function bankIsStressed(entity:Entity){return entity.kind==='bank'&&(entity.status!=='active'||entity.lending_available===false);}
export function liveCityState(){const world=useStore.getState().world;return {
 activity:world?.metrics.employment_rate??0,
 firms:world?.entities.filter(e=>e.kind==='business').map(e=>({id:e.id,open:e.status==='active'}))??[],
 stressedBanks:new Set(world?.entities.filter(bankIsStressed).map(e=>e.id)??[])
};}
// Building id -> backend entity, using the same rules as getLiveLayout but leaving layout ids (and the paths and
// landmarks that reference them) untouched, so the miniature's geometry never depends on the live world.
export function bindEntities(buildings:CityLayout['buildings']){
 const entities=useStore.getState().world?.entities??[];
 const bound=new Map<string,Entity>(),assigned=new Set<string>();
 function assign(kind:string,kinds:string[]){
  const actors=entities.filter(e=>e.kind===kind&&!assigned.has(e.id));
  const slots=buildings.filter(b=>kinds.includes(b.kind)&&!bound.has(b.id));
  actors.slice(0,slots.length).forEach((entity,i)=>{bound.set(slots[i].id,entity);assigned.add(entity.id);});
 }
 // Prefer featured banks and street shops, then use available office/tower slots.
 assign('bank',['bank']);assign('bank',['tower','office']);
 assign('business',['shop']);assign('business',['office','tower']);
 assign('household',['house']);assign('government',['coit']);assign('central_bank',['ferry']);
 return bound;
}
export function districtEntityIds(district:string){
 const city=layout as CityLayout,bound=bindEntities(city.buildings);
 return new Set(city.buildings.filter(b=>b.district===district&&bound.has(b.id)).map(b=>bound.get(b.id)!.id));
}
// Movement/demand indices are visual proxies for simulated employment, not
// observed neighborhood activity. Financial KPIs elsewhere use the API directly.
export function liveSnapshot(layout:CityLayout,baseActivity:number,bound:ReturnType<typeof bindEntities>):Snapshot{
 const s=useStore.getState(),live=liveCityState(),metrics=s.world?.metrics,ratio=Math.max(0,live.activity/Math.max(.01,baseActivity))*100;
 const firms=[...bound].filter(([,e])=>e.kind==='business').map(([id,e])=>({id,district:layout.buildings.find(b=>b.id===id)?.district??'',open:e.status==='active'}));
 const districts=Object.fromEntries(layout.districts.map(d=>{
  const local=firms.filter(f=>f.district===d.name),closed=local.filter(f=>!f.open).length;
  return [d.name,{employmentRate:ratio,disposableIncomeIndex:ratio,retailDemandIndex:ratio,
   firmOpenRate:local.length?(local.length-closed)/local.length*100:100,defaultRate:local.length?closed/local.length*100:0}];
 }));
 return {tick:s.tick,branch:'baseline',stateHash:'live',sharedSnapshotId:'live',kpis:{employment:live.activity,
  householdCash:(metrics?.household_cash_cents??0)/100,businessDefaults:metrics?.business_defaults??0,
  bankStress:metrics?.banks?(metrics.stressed_banks/metrics.banks)*100:0,
  publicInterventionCost:(metrics?.public_support_disbursed_cents??0)/100},districts,firms};
}
