import {useEffect,useMemo} from 'react';
import {Orbit,ArrowLeft,ArrowUpRight,Move,MousePointer2} from 'lucide-react';
import Globe from './globe/Globe';
import CityCanvas from './city/CityCanvas';
import LivePanel,{TopControls,KpiStrip,Timeline,BranchCompare,NetworkView} from './ui/LiveDashboard';
import {useStore,disconnect} from './state/store';
import cities from './data/cities.json';
import './styles/integration.css';

export default function ConnectedApp(){
 const s=useStore(),city=s.stage==='CITY',hasPanel=city||s.stage==='PIN_SELECTED';
 const stars=useMemo(()=>Array.from({length:1600},(_,i)=>({left:(((Math.sin(i*127.1+311.7)*43758.5453)%1+1)%1*100)+'%',top:(((Math.sin(i*269.5+183.3)*23421.631)%1+1)%1*100)+'%',opacity:.12+(i%9)/20,width:1,height:1})),[]);
 const starElements=useMemo(()=>stars.map((style,i)=><i key={i} style={style}/>),[stars]);
 useEffect(()=>{void useStore.getState().restore();return disconnect;},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea,select'))return;
  const state=useStore.getState();
  if(e.key==='Escape'){if(state.selected)state.set({selected:null});else if(state.compare)state.set({compare:false});}
  if(e.code==='Space'&&city){e.preventDefault();void state.togglePlay();}
 };addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[city]);
 const home=()=>{void s.pause().catch(error=>s.set({error:String(error)}));s.set({stage:'GLOBE',country:'',compare:false,selected:null});};
 return <div className={'app '+(city?'city-mode':'globe-mode')}>
 <div className="starfield" aria-hidden="true">{starElements}</div>
 <header className="app-header"><a className="brand" href="#" onClick={e=>{e.preventDefault();home();}}><span className="brand-mark"><Orbit size={25}/></span><span>economy<span className="brand-mode">GOD MODE</span></span></a><div className="header-right"><span className="offline-pill"><span className="tiny-dot"/>{city?s.connection.toUpperCase():'ECONOMY SIMULATOR'}</span><span className="header-caption">A small world. A big what if.</span>{s.world&&!city&&<button onClick={()=>s.set({stage:'CITY'})}>Return to economy</button>}</div></header>
 {(s.error||s.playbackError)&&<div className="integration-error" role="alert">{s.error||s.playbackError}<button onClick={()=>s.set({error:'',playbackError:''})}>Dismiss</button></div>}
 <main className={'workspace '+(hasPanel?'with-panel':'')}><section className={'world-area '+(s.compare?'comparing':'')}>
 {!city&&<><div className="explore-heading">{s.stage!=='GLOBE'&&<button className="back-button" onClick={s.back}><ArrowLeft size={14}/>Back to {s.stage==='COUNTRY'?'world':'country'}</button>}<p className="eyebrow">{s.stage==='GLOBE'?'01 / A WORLD OF POSSIBILITIES':'02 / CHOOSE YOUR ECONOMY'}</p><h2>Every economy<br/>has a story.</h2><p>Choose a place. Follow the connections.</p></div><div className="country-label"><span className="eyebrow">EXPLORING</span><span>{s.hoverCountry||s.country||'Earth'}</span></div></>}
 {city&&<><TopControls/><KpiStrip/></>}
 <div className="visual-stage">{!city?<div className="globe-layer"><Globe/></div>:<><div className={'city-layer revealed'+(s.compare||s.mode==='network'?' hidden-visual':'')}><CityCanvas key={s.world?.simulation_id}/></div>{s.mode==='network'&&!s.compare&&<NetworkView/>}{s.compare&&<BranchCompare/>}</>}</div>
 {!city&&<div className="globe-bottom">{s.stage==='GLOBE'?<><button className="explore-cta" onClick={()=>s.set({country:'United States of America',stage:'COUNTRY',notice:''})}>Start in the United States<ArrowUpRight size={16}/></button><div className="gesture-hints"><span><Move size={12}/>Drag to rotate</span><span><MousePointer2 size={12}/>Click to explore</span></div></>: /United States/.test(s.country)?<div className="city-picker"><div className="city-picker-title">UNITED STATES · 1 CITY VISUAL AVAILABLE</div><div className="city-list">{cities.map(c=><button key={c.city} className={c.playable?'playable':''} onClick={()=>c.playable?s.set({stage:'PIN_SELECTED'}):s.set({notice:'Only the San Francisco visual is available.'})}>{c.city}{c.playable?<ArrowUpRight size={12}/>:<small>soon</small>}</button>)}</div></div>:<div className="unavailable">Choose United States → San Francisco</div>}</div>}
 {s.notice&&<div className="notice" role="status">{s.notice}<button aria-label="Dismiss notice" onClick={()=>s.set({notice:''})}>×</button></div>}
 {city&&!s.compare&&<Timeline/>}<footer className="world-footer"><span>{city?'SAN FRANCISCO · STYLIZED CITY':'ECONOMY GOD MODE'}</span><span>{city?'Backend financial simulation · not a real-city forecast':'A connected world, waiting for your next question.'}</span><span>{city?s.connection:'LAYOUT 4242'}</span></footer>
 </section>{hasPanel&&<LivePanel/>}</main></div>;
}
