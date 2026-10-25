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
 const entities=useStore.getState().world?.entities??[];const bound=new Map<string,typeof entities[number]>();
 const assign=(list:CityLayout['buildings'],pool:typeof entities)=>list.forEach((b,i)=>{if(pool[i])bound.set(b.id,pool[i]);});
 // Bank buildings carry the bank institutions, shops and offices the firms (Cafe 14 first), houses the households.
 assign([...buildings.filter(b=>b.kind==='bank').sort((a,b)=>a.id.localeCompare(b.id)),...buildings.filter(b=>b.kind==='salesforce')],entities.filter(e=>e.kind==='bank'));
 assign([...buildings.filter(b=>b.id==='cafe-14'),...buildings.filter(b=>b.kind==='shop'&&b.id!=='cafe-14'),...buildings.filter(b=>b.kind==='office'),...buildings.filter(b=>b.kind==='tower')],entities.filter(e=>e.kind==='business'));
 assign(buildings.filter(b=>b.kind==='house'),entities.filter(e=>e.kind==='household'));
 assign(buildings.filter(b=>b.kind==='coit'),entities.filter(e=>e.kind==='government'));
 assign(buildings.filter(b=>b.kind==='ferry'),entities.filter(e=>e.kind==='central_bank'));
 return bound;
}
// Buildings and landmarks with no backend institution get a stable, clearly labelled illustrative profile.
export const MOCK_PREFIX='mock:';
export function mockProfile(id:string){const key=id.slice(MOCK_PREFIX.length),l=layout as unknown as CityLayout;
 const b=l.buildings.find(b=>b.id===key),mark=l.landmarks.find(m=>m.id===key);if(!b&&!mark)return null;
 let h=2166136261;for(const c of key){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}const r=(n:number)=>((h>>>n)%1000)/1000;
 const kind=mark&&!b?'landmark':b!.kind,scale=kind==='tower'?40:kind==='office'?14:kind==='landmark'||['pyramid','salesforce'].includes(kind)?60:kind==='shop'?3:1.2;
 const assets=Math.round((180000+r(3)*420000)*scale),debt=Math.round(assets*(.25+r(11)*.4)),cash=Math.round(assets*(.06+r(17)*.12));
 const role=kind==='house'?'Household':kind==='shop'?'Neighbourhood shop':kind==='office'?'Office tenant':kind==='tower'?'Downtown firm':kind==='landmark'?'Public landmark':kind==='pyramid'||kind==='salesforce'?'Landmark office tower':'Institution';
 return {id,name:b?.name??mark!.name,district:b?.district??mark!.district,role,assets,debt,cash,employees:kind==='house'?0:Math.round(2+r(7)*(scale*6))};
}
// A snapshot-shaped view of live metrics, so district activity can be derived from the running world.
export function liveSnapshot(layout:CityLayout,baseActivity:number,bound:ReturnType<typeof bindEntities>):Snapshot{
 const s=useStore.getState(),live=liveCityState(),ratio=Math.max(0,live.activity/Math.max(.01,baseActivity))*100,stressed=live.stressedBanks.size>0;
 const district={employmentRate:ratio,disposableIncomeIndex:100,retailDemandIndex:ratio,firmOpenRate:100,defaultRate:stressed?10:0};
 return {tick:s.tick,branch:'baseline',stateHash:'live',sharedSnapshotId:'live',kpis:{employment:live.activity,householdCash:0,businessDefaults:0,bankStress:stressed?30:0,publicInterventionCost:0},districts:Object.fromEntries(layout.districts.map(d=>[d.name,{...district}])),firms:[...bound].filter(([,e])=>e.kind==='business').map(([id,e])=>({id,district:'',open:e.status==='active'}))};
}
