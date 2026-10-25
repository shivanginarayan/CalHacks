import layout from './fixtures/sfCityLayout.json';
import {useStore} from '../state/store';
import type {CityLayout,Snapshot} from './types';
// Geometry is decorative. Simulated buildings use real backend institution IDs.
export function getLiveLayout():CityLayout {
 const entities=useStore.getState().world?.entities??[];
 const households=entities.filter(e=>e.kind==='household');
 const institutions=entities.filter(e=>e.kind==='bank').concat(entities.filter(e=>e.kind==='business'));
 let house=0,tower=0;
 return {...(layout as unknown as CityLayout),buildings:(layout.buildings as CityLayout['buildings']).map(b=>{
  const entity=b.kind==='house'?households[house++]:b.kind==='tower'?institutions[tower++]:
   b.kind==='coit'?entities.find(e=>e.kind==='government'):b.kind==='ferry'?entities.find(e=>e.kind==='central_bank'):undefined;
  return entity?{...b,id:entity.id,name:entity.name}:{...b,id:'scenery-'+b.id};
 })};
}
export function liveCityState(){const world=useStore.getState().world;return {
 activity:world?.metrics.employment_rate??0,
 firms:world?.entities.filter(e=>e.kind==='business').map(e=>({id:e.id,open:e.status==='active'}))??[],
 stressedBanks:new Set(world?.entities.filter(e=>e.kind==='bank'&&e.status!=='active').map(e=>e.id)??[])
};}
// Building id -> backend entity, using the same rules as getLiveLayout but leaving layout ids (and the paths and
// landmarks that reference them) untouched, so the miniature's geometry never depends on the live world.
export function bindEntities(buildings:CityLayout['buildings']){
 const entities=useStore.getState().world?.entities??[];
 const households=entities.filter(e=>e.kind==='household');
 const institutions=entities.filter(e=>e.kind==='bank').concat(entities.filter(e=>e.kind==='business'));
 let house=0,tower=0;const bound=new Map<string,typeof entities[number]>();
 for(const b of buildings){const entity=b.kind==='house'?households[house++]:b.kind==='tower'?institutions[tower++]:b.kind==='coit'?entities.find(e=>e.kind==='government'):b.kind==='ferry'?entities.find(e=>e.kind==='central_bank'):undefined;if(entity)bound.set(b.id,entity);}
 return bound;
}
// A snapshot-shaped view of live metrics, so district activity can be derived from the running world.
export function liveSnapshot(layout:CityLayout,baseActivity:number,bound:ReturnType<typeof bindEntities>):Snapshot{
 const s=useStore.getState(),live=liveCityState(),ratio=Math.max(0,live.activity/Math.max(.01,baseActivity))*100,stressed=live.stressedBanks.size>0;
 const district={employmentRate:ratio,disposableIncomeIndex:100,retailDemandIndex:ratio,firmOpenRate:100,defaultRate:stressed?10:0};
 return {tick:s.tick,branch:'baseline',stateHash:'live',sharedSnapshotId:'live',kpis:{employment:live.activity,householdCash:0,businessDefaults:0,bankStress:stressed?30:0,publicInterventionCost:0},districts:Object.fromEntries(layout.districts.map(d=>[d.name,{...district}])),firms:[...bound].filter(([,e])=>e.kind==='business').map(([id,e])=>({id,district:'',open:e.status==='active'}))};
}
