import layout from './fixtures/sfCityLayout.json';
import {useStore} from '../state/store';
import type {CityLayout} from './types';
// Geometry is decorative. Simulated buildings use real backend institution IDs.
export function getLiveLayout():CityLayout {
 const entities=useStore.getState().world?.entities??[];
 const households=entities.filter(e=>e.kind==='household');
 const institutions=entities.filter(e=>e.kind==='bank').concat(entities.filter(e=>e.kind==='business'));
 let house=0,tower=0;
 return {...layout,buildings:layout.buildings.map(b=>{
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
