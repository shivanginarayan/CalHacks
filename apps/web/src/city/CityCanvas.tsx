import {drawOverviewLabels,type PlacedLabel} from './cityLabels';
import {useEffect,useRef,useState} from 'react';
import {Plus,Minus,ArrowLeft,MapPin,Maximize2} from 'lucide-react';
import {getCityLayout} from '../data/fixtures';
import {bindEntities,liveSnapshot,bankIsStressed} from '../data/liveCity';
import type {Building,CityLayout,Snapshot} from '../data/types';
import {useStore} from '../state/store';
import {useCityView} from '../state/cityView';
import {CityCamera,levelOfDetail} from './CityCamera';
import {StaticSceneCache,buildingBounds,buildingOutline,landmarkAt,polygon} from './cityRenderer';
import {windowDots} from './buildingArt';
import {project,buildingCenter,pointInPolygon,intersects,type Point} from './cityGeometry';
import {readDistrictActivity,type DistrictActivity} from './activity';
import {createMoverPool,updateMovers,drawMover,shopDoor,type VisualMover} from './movers';
import EconomicMapOverlay from './EconomicMapOverlay';
import {buildEntityBuildingMap,buildDynamicParticles,getBuildingRoofPoint,type DynamicParticle} from './economicDynamics';
import {playSalaryChime,playCreditSound,playCrisisShockRumble,playRescueHarmonic} from './economicAudio';

let nextMount=0;
const sceneCaches=new WeakMap<CityLayout,StaticSceneCache>();
function cachedScene(layout:CityLayout){let cache=sceneCaches.get(layout);if(!cache){cache=new StaticSceneCache(layout);sceneCaches.set(layout,cache);}return cache;}
type Navigation={step:(direction:number)=>void;home:()=>void;district:(kind:'palace'|'park'|'shops')=>void};
type Hit={kind:'building';building:Building}|{kind:'landmark';id:string;name:string;district:string;x:number;y:number}|{kind:'mover';mover:VisualMover}|null;

export default function CityCanvas(){
 const ref=useRef<HTMLCanvasElement>(null),navigation=useRef<Navigation|null>(null);const [hover,setHover]=useState('');const view=useCityView();
 useEffect(()=>{
  useCityView.setState({lod:0,zoomed:false,districtFilter:null,focusLabel:null});
  const canvas=ref.current!,ctx=canvas.getContext('2d')!,layout=getCityLayout(),cache=cachedScene(layout),camera=new CityCamera(),pool=createMoverPool(layout);
  let bound=bindEntities(layout.buildings);let entityBuildingMap=buildEntityBuildingMap(layout,bound);
  const entityOf=(b:Building)=>bound.get(b.id),baseActivity=1,baseline=liveSnapshot(layout,baseActivity,bound);
  for(const district of Object.values(baseline.districts))district.employmentRate=100;
  let snapshot=liveSnapshot(layout,baseActivity,bound);let key='';let stressedIds=new Set<string>();let firms=new Map<string,boolean>(),activities=new Map<string,DistrictActivity>();
  let frame=0,last=performance.now(),elapsed=0,lastDiagnostics=0,disposed=false,lastLod=-1,lastZoomed=false;const dpr=Math.min(devicePixelRatio,1.75);let hoveredBuilding:Building|null=null;let overviewLabels:PlacedLabel[]=[];
  const mountId=++nextMount;canvas.dataset.mountId=String(mountId);canvas.dataset.moverCount=String(pool.length);canvas.dataset.staticRenders=String(cache.renderCount);
  const outlines=layout.buildings.map(b=>({building:b,bounds:buildingBounds(b),outline:buildingOutline(b)}));
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);camera.resize(w,h);};const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const districtAt=(x:number,y:number)=>{const landmark=landmarkAt(layout,x,y);if(landmark)return landmark.district;return layout.districts.reduce((best,d)=>{const a=project(best.x,best.y),b=project(d.x,d.y);return Math.hypot(x-b[0],y-b[1])<Math.hypot(x-a[0],y-a[1])?d:best;}).name;};
  const focusDistrict=(district:string,x:number,y:number,label:string,zoom=2.55)=>{camera.focus(x,y,zoom);useCityView.setState({districtFilter:district,focusLabel:label});};
  const home=()=>{camera.home();useCityView.setState({districtFilter:null,focusLabel:null});};
  navigation.current={home,step:direction=>{const stops=[1,2.55,4.6,6.8];const next=direction>0?stops.find(z=>z>camera.target.zoom+.1)??8:[...stops].reverse().find(z=>z<camera.target.zoom-.1)??1;if(next===1)home();else {camera.zoomAt(camera.width/2,camera.height/2,next);const district=districtAt(camera.pose.x,camera.pose.y);useCityView.setState({districtFilter:district,focusLabel:district});}},district:kind=>{if(kind==='shops'){const b=layout.buildings.find(b=>b.id==='cafe-14')!,p=buildingCenter(b);focusDistrict(b.district,p[0],p[1]-7,'Mission shops',4.6);}else {const landmark=layout.landmarks.find(l=>l.kind===kind)!;focusDistrict(landmark.district,landmark.x,landmark.y,landmark.name);}}};
  const occluded=(x:number,y:number)=>cache.occluded(x,y);

  function refreshActivity(){
   const s=useStore.getState(),nextKey=s.tick+'|'+s.world?.simulation_id+'|'+s.world?.latest_event_sequence+'|'+s.world?.metrics.employment_rate+'|'+s.world?.entities.map(e=>e.status+':'+e.lending_available).join('');
   if(key===nextKey)return;
   key=nextKey;
   bound=bindEntities(layout.buildings);
   entityBuildingMap=buildEntityBuildingMap(layout,bound);
   snapshot=liveSnapshot(layout,baseActivity,bound);
   stressedIds=new Set([...bound].filter(([,e])=>bankIsStressed(e)).map(([id])=>id));
   firms=new Map(snapshot.firms.map(f=>[f.id,f.open]));
   for(const d of layout.districts){const next=readDistrictActivity(snapshot,baseline,d.name);activities.set(d.name,next);}

   if(useCityView.getState().soundEnabled){
    if(s.events.some(e=>e.simulation_tick===s.tick&&e.event_type==='bank_asset_loss'))playCrisisShockRumble();
    else if(s.events.some(e=>e.simulation_tick===s.tick&&(e.event_type==='intervention_settled'||e.event_type==='agent_recommendation_applied')))playRescueHarmonic();
    else if(s.events.some(e=>e.simulation_tick===s.tick&&e.event_type==='loan_issued'))playCreditSound();
    else if(s.events.some(e=>e.simulation_tick===s.tick&&e.event_type==='salary'))playSalaryChime();
   }
  }
  const lerped=new Map<string,DistrictActivity>();

  let dynamicParticles:DynamicParticle[]=[];
  let particleKey='';
  let tourTimer=0,tourStep=0;
  const tourStops=[
   {district:'Financial District',x:997,y:480,label:'Bank 1 Capital',zoom:3.8},
   {district:'Mission District',x:665,y:566,label:'Café Seventy8 Production',zoom:4.6},
   {district:'Downtown',x:1199,y:593,label:'Central Bank Policy Authority',zoom:3.5},
   {district:'North Beach',x:857,y:309,label:'Government Fiscal Treasury',zoom:3.5},
   {district:'San Francisco',x:720,y:540,label:'Macro Living Miniature',zoom:1.0}
  ];

  function refreshParticles(time:number){
   const s=useStore.getState();
   const activeLayer=useCityView.getState().activeLayer;
   dynamicParticles=buildDynamicParticles(s.events,entityBuildingMap,activeLayer,s.tick,time);
  }

  const loop=(now:number)=>{
   if(disposed)return;
   const dt=Math.max(0,Math.min(.05,(now-last)/1000));
   last=now;
   elapsed+=dt;
   camera.update(now);
   refreshActivity();

   const cityView=useCityView.getState();
   if(cityView.tourActive){
    tourTimer+=dt;
    if(tourTimer>4.8){
     tourTimer=0;
     tourStep=(tourStep+1)%tourStops.length;
     const stop=tourStops[tourStep];
     if(stop.zoom<=1.01)home();
     else focusDistrict(stop.district,stop.x,stop.y,stop.label,stop.zoom);
    }
   } else {
    tourTimer=0;
    tourStep=0;
   }

   const s=useStore.getState();
   const activeLayer=useCityView.getState().activeLayer;
   const nextParticleKey=s.tick+'|'+s.events.length+'|'+activeLayer;
   if(particleKey!==nextParticleKey){particleKey=nextParticleKey;refreshParticles(elapsed);}

   const alpha=1-Math.exp(-dt*6);
   for(const [district,target]of activities){
    const current=lerped.get(district);
    if(!current)lerped.set(district,{...target});
    else{
     current.employment+=(target.employment-current.employment)*alpha;
     current.retail+=(target.retail-current.retail)*alpha;
     current.leisure+=(target.leisure-current.leisure)*alpha;
     current.open+=(target.open-current.open)*alpha;
     current.defaults=target.defaults;
     current.queueCapacity+=(target.queueCapacity-current.queueCapacity)*alpha;
     current.dimShops=target.dimShops;
     current.shutters=target.shutters;
     current.bankStress=target.bankStress;
    }
   }

   const visualTime=canvas.dataset.visualTime===undefined?elapsed:Number(canvas.dataset.visualTime);
   const lod=levelOfDetail(camera.pose.zoom,camera.buildingFocus),viewport=camera.viewport(),scale=camera.baseScale*camera.pose.zoom;
   if((camera.pose.zoom>1.02)!==lastZoomed){lastZoomed=camera.pose.zoom>1.02;useCityView.setState({zoomed:lastZoomed});}
   if(lod!==lastLod){lastLod=lod;useCityView.setState({lod});canvas.dataset.lod=String(lod);}

   ctx.setTransform(dpr,0,0,dpr,0,0);
   ctx.clearRect(0,0,camera.width,camera.height);

   // --- World-Space Rendering ---
   ctx.save();
   ctx.translate(camera.width/2,camera.height/2);
   ctx.scale(scale,scale);
   ctx.translate(-camera.pose.x,-camera.pose.y);

   const tiles=cache.draw(ctx,Math.min(2,lod) as 0|1|2,viewport);

   // District Economic Distress Heatmap
   if(cityView.heatmapActive){
    for(const d of layout.districts){
     const a=lerped.get(d.name);
     const stress=a?.bankStress?0.75:(100-(a?.employment??100))/100;
     if(stress>0.04){
      const dp=project(d.x,d.y);
      const grad=ctx.createRadialGradient(dp[0],dp[1],10,dp[0],dp[1],130);
      grad.addColorStop(0,`rgba(239,68,68,${Math.min(0.4,stress*0.5)})`);
      grad.addColorStop(0.6,`rgba(245,158,11,${Math.min(0.25,stress*0.3)})`);
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.ellipse(dp[0],dp[1],130,68,0,0,7);
      ctx.fill();
     }
    }
   }
   const oldPositions=canvas.dataset.visualTime!==undefined;
   if(oldPositions)for(const m of pool)m.progress=((m.id*.61803398875)%1+visualTime*m.speed/m.length)%1;
   const stats=updateMovers(pool,oldPositions?0:dt,visualTime,lerped,firms,viewport);
   let visibleMovers=0;
   cache.drawDepth(ctx,Math.min(2,lod) as 0|1|2,viewport,pool,m=>{drawMover(ctx,m,lod,visualTime);visibleMovers++;});

   // Financial changes are dynamic overlays; the static miniature never redraws on a tick.
   let closed=0;
   for(const b of layout.buildings){
    const bounds=buildingBounds(b);
    if(!intersects(bounds,viewport))continue;
    const a=lerped.get(b.district)!;
    const isClosed=firms.get(b.id)===false;
    if(isClosed||b.kind==='shop'&&(a.dimShops&&Number(b.id.replace(/\D/g,''))%5===0||a.shutters)){
     const p=shopDoor(b);const roof=buildingOutline(b);
     polygon(ctx,roof,isClosed?'rgba(28,43,43,.61)':'rgba(38,54,47,.28)');
     ctx.fillStyle=isClosed?'#6b7770':'#7f8b7e';
     ctx.fillRect(p[0]-6,p[1]-13,12,12);
     if(lod>0&&isClosed){
      for(let y=3;y<12;y+=3){ctx.strokeStyle='#4d6158';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(p[0]-6,p[1]-y);ctx.lineTo(p[0]+6,p[1]-y);ctx.stroke();}
     }
     if(isClosed)closed++;
    }

    // Stressed Bank shockwave ripple effect and borrower exposure lines
    if(stressedIds.has(b.id)){
     const p=project(b.x+b.w/2,b.y+b.d/2);
     const pulse=(Math.sin(visualTime*Math.PI*2/3)+1)/2;

     // Concentric shockwave ripple rings
     for(let ring=0;ring<3;ring++){
      const ringPhase=((visualTime*0.7+ring*0.33)%1);
      const radius=20+ringPhase*45;
      const alpha=(1-ringPhase)*0.7;
      ctx.strokeStyle=`rgba(239,68,68,${alpha})`;
      ctx.lineWidth=(1.8*(1-ringPhase))/Math.sqrt(scale);
      ctx.beginPath();
      ctx.ellipse(p[0],p[1],radius,radius*0.48,0,0,7);
      ctx.stroke();
     }

     // Red beacon center
     ctx.strokeStyle=`rgba(239,68,68,${.4+.6*pulse})`;
     ctx.lineWidth=1.5/Math.sqrt(scale);
     ctx.beginPath();
     ctx.ellipse(p[0],p[1],25+pulse*5,12+pulse*3,0,0,7);
     ctx.stroke();
     ctx.fillStyle='#ef4444';
     ctx.beginPath();
     ctx.arc(p[0],p[1]-b.h-6,2.5,0,7);
     ctx.fill();

     // Light up borrower connections from this stressed bank to its borrowing businesses
     const bankEntity=entityOf(b);
     if(bankEntity&&s.world){
      const borrowers=s.world.entities.filter(e=>e.kind==='business'&&e.bank_id===bankEntity.id);
      for(const borrower of borrowers){
       const borrowerBuilding=entityBuildingMap.get(borrower.id);
       if(borrowerBuilding){
        const bp=buildingCenter(borrowerBuilding);
        const linePulse=(Math.sin(visualTime*5)+1)/2;
        ctx.strokeStyle=`rgba(248,113,113,${0.35+0.45*linePulse})`;
        ctx.lineWidth=1.2/Math.sqrt(scale);
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.moveTo(p[0],p[1]);
        ctx.lineTo(bp[0],bp[1]);
        ctx.stroke();
        ctx.setLineDash([]);
       }
      }
     }
    }
   }

   // --- Real-time Animated Transaction Flow Particles ---
   for(let i=0;i<dynamicParticles.length;i++){
    const part=dynamicParticles[i];
    const phase=(visualTime*part.speed+i*0.19)%1;
    const x=part.from[0]+(part.to[0]-part.from[0])*phase;
    const y=part.from[1]+(part.to[1]-part.from[1])*phase;
    if(x<viewport.x||x>viewport.x+viewport.width||y<viewport.y||y>viewport.y+viewport.height)continue;

    // Glowing particle head
    ctx.fillStyle=part.color;
    ctx.shadowColor=part.color;
    ctx.shadowBlur=4;
    ctx.beginPath();
    ctx.arc(x,y,2.2,0,7);
    ctx.fill();
    ctx.shadowBlur=0;

    // Subtle particle tail
    const trailPhase=Math.max(0,phase-0.035);
    const tx=part.from[0]+(part.to[0]-part.from[0])*trailPhase;
    const ty=part.from[1]+(part.to[1]-part.from[1])*trailPhase;
    ctx.strokeStyle=part.color;
    ctx.lineWidth=1.1;
    ctx.beginPath();
    ctx.moveTo(tx,ty);
    ctx.lineTo(x,y);
    ctx.stroke();
   }

   // Night Lighting
   const night=visualTime%60>=55?.28:0;
   if(night){
    const {center:[tx,ty],radius:tr,tilt}=layout.diorama;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(tx,ty,tr,tr*tilt,0,0,7);
    ctx.clip();
    ctx.fillStyle=`rgba(12,28,48,${night})`;
    ctx.fillRect(0,0,1440,940);
    ctx.restore();
    ctx.fillStyle='#fde68a';
    for(const b of layout.buildings){
     if(firms.get(b.id)===false||!intersects(buildingBounds(b),viewport))continue;
     for(const [i,p]of windowDots(b,1).entries())if((i*7+b.h)%3!==0)ctx.fillRect(p[0]-.6,p[1]-1,1.2,1.6);
    }
   }

   const selected=s.selected,selectedBuilding=layout.buildings.find(b=>entityOf(b)?.id===selected);
   if(selectedBuilding){
    const p=project(selectedBuilding.x+selectedBuilding.w/2,selectedBuilding.y+selectedBuilding.d/2);
    ctx.strokeStyle='#ffdc73';
    ctx.lineWidth=1.7/Math.sqrt(scale);
    ctx.beginPath();
    ctx.ellipse(p[0],p[1],22,11,0,0,7);
    ctx.stroke();
   }

   if(hoveredBuilding){
    ctx.beginPath();
    buildingOutline(hoveredBuilding).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));
    ctx.closePath();
    ctx.strokeStyle='#f5dfa1';
    ctx.lineWidth=1.3/Math.sqrt(scale);
    ctx.stroke();
   }

   ctx.restore();

   // --- Screen-Space Crisp Dynamic Institution Badges ---
   const screenX=(wx:number)=>camera.width/2+(wx-camera.pose.x)*scale;
   const screenY=(wy:number)=>camera.height/2+(wy-camera.pose.y)*scale;

   // Render institution badges directly on the map
   if(s.world){
    ctx.save();
    ctx.textAlign='center';
    ctx.textBaseline='middle';

    // 1. Commercial Banks 1-5 Badges
    const banks=s.world.entities.filter(e=>e.kind==='bank');
    for(const bank of banks){
     const b=entityBuildingMap.get(bank.id);
     if(!b)continue;
     const roof=getBuildingRoofPoint(b);
     const sx=screenX(roof[0]),sy=screenY(roof[1])-14;
     if(sx<-60||sx>camera.width+60||sy<-40||sy>camera.height+40)continue;

     const isStressed=bank.status!=='active'||bank.lending_available===false;
     const car=bank.capital_ratio??0;
     const carText=(car*100).toFixed(1)+'% CAR';
     const healthColor=car>=0.12?'#34d399':car>=0.08?'#f59e0b':'#ef4444';

     const pillW=78,pillH=26;
     ctx.fillStyle=isStressed?'rgba(35,16,20,0.92)':'rgba(12,21,30,0.88)';
     ctx.beginPath();
     ctx.roundRect(sx-pillW/2,sy-pillH/2,pillW,pillH,7);
     ctx.fill();
     ctx.strokeStyle=isStressed?'rgba(239,68,68,0.7)':'rgba(255,255,255,0.15)';
     ctx.lineWidth=isStressed?1.2:0.8;
     ctx.stroke();

     // Bank Name
     ctx.font='700 9px system-ui';
     ctx.fillStyle=isStressed?'#fca5a5':'#f1f5f9';
     ctx.fillText(bank.name,sx,sy-5);

     // Mini CAR Health Meter
     const barW=46,barH=3;
     ctx.fillStyle='rgba(255,255,255,0.12)';
     ctx.fillRect(sx-barW/2,sy+2,barW,barH);
     ctx.fillStyle=healthColor;
     const fillW=Math.max(2,Math.min(barW,(car/0.2)*barW));
     ctx.fillRect(sx-barW/2,sy+2,fillW,barH);

     // CAR Percentage text
     ctx.font='600 7.5px system-ui';
     ctx.fillStyle=healthColor;
     ctx.fillText(isStressed?'FROZEN':carText,sx,sy+9);
    }

    // 2. Central Bank Badge (Ferry Building)
    const cb=s.world.entities.find(e=>e.kind==='central_bank');
    const cbBuilding=cb?entityBuildingMap.get(cb.id):undefined;
    if(cbBuilding){
     const roof=getBuildingRoofPoint(cbBuilding);
     const sx=screenX(roof[0]),sy=screenY(roof[1])-12;
     if(sx>-50&&sx<camera.width+50&&sy>-30&&sy<camera.height+30){
      const pillW=90,pillH=24;
      ctx.fillStyle='rgba(25,23,14,0.92)';
      ctx.beginPath();
      ctx.roundRect(sx-pillW/2,sy-pillH/2,pillW,pillH,7);
      ctx.fill();
      ctx.strokeStyle='rgba(243,209,108,0.55)';
      ctx.lineWidth=1;
      ctx.stroke();

      ctx.font='700 8.5px system-ui';
      ctx.fillStyle='#fef08a';
      ctx.fillText('🏛️ Central Bank',sx,sy-4);
      ctx.font='600 7.5px system-ui';
      ctx.fillStyle='#f3d16c';
      ctx.fillText(s.report?.recommendation?'⚡ Rescue Available':'Macro Prudential',sx,sy+5);
     }
    }

    // 3. Government Badge (Coit Tower)
    const gov=s.world.entities.find(e=>e.kind==='government');
    const govBuilding=gov?entityBuildingMap.get(gov.id):undefined;
    if(govBuilding){
     const roof=getBuildingRoofPoint(govBuilding);
     const sx=screenX(roof[0]),sy=screenY(roof[1])-14;
     if(sx>-50&&sx<camera.width+50&&sy>-30&&sy<camera.height+30){
      const pillW=86,pillH=22;
      ctx.fillStyle='rgba(14,24,36,0.92)';
      ctx.beginPath();
      ctx.roundRect(sx-pillW/2,sy-pillH/2,pillW,pillH,7);
      ctx.fill();
      ctx.strokeStyle='rgba(56,189,248,0.45)';
      ctx.lineWidth=1;
      ctx.stroke();

      ctx.font='700 8.5px system-ui';
      ctx.fillStyle='#bae6fd';
      ctx.fillText('🏛️ Government',sx,sy-3);
      ctx.font='600 7px system-ui';
      ctx.fillStyle='#7dd3fc';
      ctx.fillText('Fiscal Treasury',sx,sy+5);
     }
    }

    // 4. Featured Business 1 (Café 14 / Cafe Seventy8) Badge
    const b1=s.world.entities.find(e=>e.id==='business_1');
    const cafeBuilding=b1?entityBuildingMap.get(b1.id):undefined;
    if(b1&&cafeBuilding){
     const roof=getBuildingRoofPoint(cafeBuilding);
     const sx=screenX(roof[0]),sy=screenY(roof[1])-12;
     if(sx>-50&&sx<camera.width+50&&sy>-30&&sy<camera.height+30){
      const isClosed=b1.status!=='active';
      const hasMissedPayroll=(b1 as unknown as {missed_payroll_ticks?:number}).missed_payroll_ticks!>0;
      const pillW=88,pillH=24;

      ctx.fillStyle=isClosed?'rgba(35,16,18,0.92)':hasMissedPayroll?'rgba(35,26,14,0.92)':'rgba(12,25,23,0.88)';
      ctx.beginPath();
      ctx.roundRect(sx-pillW/2,sy-pillH/2,pillW,pillH,7);
      ctx.fill();
      ctx.strokeStyle=isClosed?'rgba(239,68,68,0.6)':hasMissedPayroll?'rgba(245,158,11,0.6)':'rgba(52,211,153,0.4)';
      ctx.lineWidth=0.9;
      ctx.stroke();

      ctx.font='700 8.5px system-ui';
      ctx.fillStyle=isClosed?'#fca5a5':hasMissedPayroll?'#fde68a':'#a7f3d0';
      ctx.fillText('☕ Café Seventy8',sx,sy-4);

      ctx.font='600 7.5px system-ui';
      ctx.fillStyle=isClosed?'#ef4444':hasMissedPayroll?'#f59e0b':'#34d399';
      ctx.fillText(isClosed?'CLOSED':hasMissedPayroll?'⚠️ Missed Payroll':`📦 ${b1.goods_units??0} goods`,sx,sy+5);
     }
    }

    ctx.restore();
   }

   if(lod===0){
    const labels=overviewLabels=drawOverviewLabels(ctx,layout,(x,y)=>[camera.width/2+(x-camera.pose.x)*scale,camera.height/2+(y-camera.pose.y)*scale],camera.width,camera.height);
    canvas.dataset.labelCount=String(labels.length);
   }

   if(now-lastDiagnostics>200){
    lastDiagnostics=now;
    Object.assign(canvas.dataset,{
     cameraX:camera.pose.x.toFixed(3),
     cameraY:camera.pose.y.toFixed(3),
     cameraZoom:camera.pose.zoom.toFixed(4),
     baseScale:camera.baseScale.toFixed(5),
     visibleTiles:String(tiles),
     visibleMovers:String(visibleMovers),
     activeMovers:String(stats.active),
     queueCount:String(stats.queued),
     closedShops:String(closed),
     boundEntities:String(bound.size),
     stressedBanks:String(stressedIds.size),
     closedBusinesses:String([...firms.values()].filter(open=>!open).length),
     tick:String(snapshot.tick),
     branch:snapshot.branch
    });
   }
   frame=requestAnimationFrame(loop);
  };
  frame=requestAnimationFrame(loop);

  const local=(e:{clientX:number;clientY:number}):Point=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.clientWidth/r.width,(e.clientY-r.top)*canvas.clientHeight/r.height];};
  const hit=(p:Point):Hit=>{
   if(levelOfDetail(camera.pose.zoom)===0){
    const label=overviewLabels.find(a=>p[0]>=a.box.x&&p[0]<=a.box.x+a.box.width&&p[1]>=a.box.y&&p[1]<=a.box.y+a.box.height);
    if(label){
     const spec=layout.labels.find(a=>a.id===label.id)!,a=layout.landmarks.find(a=>a.id===spec.landmarkId);
     if(a&&!['marina','financial-district'].includes(spec.id))return {...a,kind:'landmark'};
     return {kind:'landmark',id:spec.id,name:spec.district,district:spec.district,x:spec.anchor[0],y:spec.anchor[1]};
    }
   }
   const [x,y]=camera.screenToWorld(...p);
   const landmark=landmarkAt(layout,x,y);
   if(landmark&&!['park','palace'].includes(landmark.kind))return {...landmark,kind:'landmark'};
   const radius=5/(camera.baseScale*camera.pose.zoom);
   let closest:VisualMover|undefined;let distance=radius*radius;
   for(const m of pool){
    if(!m.visible||!m.active||occluded(m.x,m.y))continue;
    const d=(m.x-x)**2+(m.y-y)**2;
    if(d<distance){distance=d;closest=m;}
   }
   if(closest)return {kind:'mover',mover:closest};
   if(landmark)return {...landmark,kind:'landmark'};
   for(let i=outlines.length-1;i>=0;i--){
    const o=outlines[i];
    if(x>o.bounds.x&&x<o.bounds.x+o.bounds.width&&y>o.bounds.y&&y<o.bounds.y+o.bounds.height&&pointInPolygon(x,y,o.outline))return {kind:'building',building:o.building};
   }
   return null;
  };

  const focusHit=(h:Hit,p:Point,districtOnly=false)=>{
   if(h?.kind==='mover'){const household=useStore.getState().world?.entities.find(e=>e.kind==='household');if(household)useStore.getState().set({selected:household.id});return;}
   if(h?.kind==='building'){const b=h.building,p=project(b.x+b.w/2,b.y+b.d/2,b.h*.45+(b.elevation??0));camera.focus(p[0],p[1],6.8,true);const entity=entityOf(b);if(entity)useStore.getState().set({selected:entity.id});useCityView.setState({focusLabel:b.name});return;}
   if(h?.kind==='landmark'){focusDistrict(h.district,h.x,h.y,h.name);const entity=bound.get(h.id);if(entity)useStore.getState().set({selected:entity.id});return;}
   if(districtOnly){const world=camera.screenToWorld(...p),district=districtAt(...world);focusDistrict(district,world[0],world[1],district);}
  };

  let clickTimer:ReturnType<typeof setTimeout>|undefined;let dragged=false,suppressUntil=0,pinchDistance=0;const pointers=new Map<number,Point>();
  const click=(e:MouseEvent)=>{if(performance.now()<suppressUntil)return;const p=local(e),picked=hit(p);clearTimeout(clickTimer);clickTimer=setTimeout(()=>focusHit(picked,p),190);};
  const double=(e:MouseEvent)=>{e.preventDefault();clearTimeout(clickTimer);const p=local(e);focusHit(hit(p),p,true);};
  const down=(e:PointerEvent)=>{dragged=false;pointers.set(e.pointerId,local(e));canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);clearTimeout(clickTimer);}};
  const move=(e:PointerEvent)=>{
   const p=local(e),old=pointers.get(e.pointerId);
   if(old){
    pointers.set(e.pointerId,p);
    if(pointers.size===2){
     const pair=[...pointers.values()],distance=Math.hypot(pair[0][0]-pair[1][0],pair[0][1]-pair[1][1]),mid:Point=[(pair[0][0]+pair[1][0])/2,(pair[0][1]+pair[1][1])/2];
     if(pinchDistance>0){camera.zoomAt(...mid,camera.target.zoom*distance/pinchDistance);const world=camera.screenToWorld(...mid);useCityView.setState({districtFilter:districtAt(...world)});}
     pinchDistance=distance;dragged=true;suppressUntil=performance.now()+300;
    } else if(camera.pose.zoom>1.02){
     const dx=p[0]-old[0],dy=p[1]-old[1];
     if(Math.abs(dx)+Math.abs(dy)>1){camera.pan(dx,dy);dragged=true;suppressUntil=performance.now()+300;}
    }
    canvas.style.cursor='grabbing';
    return;
   }
   const h=hit(p);
   hoveredBuilding=h?.kind==='building'?h.building:null;
   const text=h?.kind==='building'?h.building.name+(firms.get(h.building.id)===false?' · Closed':'')+' · '+h.building.district:h?.kind==='landmark'?h.name+' · '+h.district:h?.kind==='mover'?'Representative renter households · visual role group':'';
   setHover(v=>v===text?v:text);
   canvas.style.cursor=h?'pointer':camera.pose.zoom>1?'grab':'default';
  };
  const up=(e:PointerEvent)=>{pointers.delete(e.pointerId);if(dragged)suppressUntil=performance.now()+250;if(pointers.size<2)pinchDistance=0;};
  const wheel=(e:WheelEvent)=>{e.preventDefault();clearTimeout(clickTimer);const p=local(e),world=camera.screenToWorld(...p);camera.zoomAt(...p,camera.target.zoom*Math.exp(-e.deltaY*(e.ctrlKey?.008:.0018)));if(camera.target.zoom<=1.01)useCityView.setState({districtFilter:null,focusLabel:null});else useCityView.setState({districtFilter:districtAt(...world),focusLabel:districtAt(...world)});};
  const leave=()=>{if(!pointers.size){setHover('');hoveredBuilding=null;}};
  const keydown=(e:KeyboardEvent)=>{if(e.key==='+'||e.key==='='){e.preventDefault();navigation.current?.step(1);}else if(e.key==='-'){e.preventDefault();navigation.current?.step(-1);}else if(e.key==='Home'){e.preventDefault();home();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&camera.pose.zoom>1){e.preventDefault();camera.pan(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0,e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0);}};

  canvas.addEventListener('pointerleave',leave);canvas.addEventListener('click',click);canvas.addEventListener('dblclick',double);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);
  return()=>{
   disposed=true;cancelAnimationFrame(frame);clearTimeout(clickTimer);ro.disconnect();navigation.current=null;
   canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('click',click);canvas.removeEventListener('dblclick',double);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keydown);
  };
 },[]);

 return (
  <div className="city-scene" data-detail-level={view.lod}>
   <canvas ref={ref} tabIndex={0} aria-label="Living San Francisco miniature. Scroll or pinch to zoom, drag to pan, click a building to inspect. Plus and minus zoom; Home returns to the whole city."/>
   <div className="tilt-shift"/>
   <div className="city-navigation">
    <span className="city-detail-label">{['WHOLE CITY','DISTRICT VIEW','STREET VIEW','BUILDING FOCUS'][view.lod]}</span>
    <div className="city-district-shortcuts">
     <button onClick={()=>navigation.current?.district('palace')}>Palace of Fine Arts <MapPin size={10}/></button>
     <button onClick={()=>navigation.current?.district('park')}>Golden Gate Park <MapPin size={10}/></button>
     <button onClick={()=>navigation.current?.district('shops')}>Mission shops <MapPin size={10}/></button>
    </div>
   </div>
   <div className="city-zoom-controls">
    <div>
     <button aria-label="Zoom out" onClick={()=>navigation.current?.step(-1)} disabled={!view.zoomed}><Minus size={15}/></button>
     <Maximize2 size={12}/>
     <button aria-label="Zoom in" onClick={()=>navigation.current?.step(1)}><Plus size={15}/></button>
    </div>
    {view.zoomed&&<button className="city-home" onClick={()=>navigation.current?.home()}><ArrowLeft size={12}/> Back to whole city</button>}
   </div>
   {view.districtFilter&&<div className="city-district-filter"><span>{view.districtFilter}</span><button onClick={()=>view.setDistrict(null)}>Show whole-city feed ×</button></div>}
   {hover&&<div className="landmark-tooltip">{hover}</div>}
   <div className="map-caption"><span className="tiny-dot"/> LIVE MINIATURE <span>37.7749° N · 122.4194° W</span></div>
   <EconomicMapOverlay />
  </div>
 );
}
