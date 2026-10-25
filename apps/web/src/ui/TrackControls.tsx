import {useEffect,useState} from 'react';
import {api} from '../data/api';
import {useStore} from '../state/store';

// Apify calibration choices are hidden, not removed; set true to offer them again.
const SHOW_CALIBRATIONS=false;
export function WorldDataOptions(){
 const s=useStore(),[items,setItems]=useState<{calibration_id:string;collected_at:string}[]>([]);
 useEffect(()=>{let active=true;void api<typeof items>('/api/calibrations').then(v=>{if(active)setItems(v);}).catch(()=>{});return()=>{active=false;};},[]);
 return <label className="slider-label">Price and wage inputs<select aria-label="World calibration" value={s.selectedCalibration} onChange={e=>s.set({selectedCalibration:e.target.value})}>
 <option value="">Census + FDIC data 2024</option>{SHOW_CALIBRATIONS&&items.map(c=><option key={c.calibration_id} value={c.calibration_id}>Apify: {c.calibration_id} · {c.collected_at.slice(0,10)}</option>)}</select>
 {SHOW_CALIBRATIONS&&<small>Opt-in samples are frozen in each world. Rent remains reference data.</small>}</label>;
}

export function CreditSafeguards({businessId}:{businessId:string}){
 const s=useStore(),[profiles,setProfiles]=useState<string[]>([]),[profile,setProfile]=useState(''),[threshold,setThreshold]=useState(1000);
 useEffect(()=>{let active=true;void api<{profiles:string[]}>('/api/credit/profiles').then(v=>{if(active)setProfiles(v.profiles);}).catch(()=>{});return()=>{active=false;};},[]);
 const running=s.job?.status==='queued'||s.job?.status==='running';
 return <details className="sponsor-integrations"><summary>Credit safeguards</summary><p className="muted">Loans above this limit require an explicit human review before settlement.</p>
 <label>Review above USD<input aria-label="Credit human approval threshold" type="number" min="0.01" max="5000" step="0.01" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label>
 <label>Owner credit evidence<select aria-label="CRS underwriting profile" value={profile} onChange={e=>setProfile(e.target.value)}><option value="">Financial checks only</option>{profiles.map(p=><option key={p} value={p}>CRS sandbox: {p}</option>)}</select></label>
 <p className="muted">CRS flags and scores come from configured sponsor test profiles. Unknown results require review; blocked identities cannot be overridden.</p>
 <button disabled={s.busy||running||!Number.isFinite(threshold)||threshold<.01||threshold>5000} onClick={()=>void s.startJob('credit',businessId,{human_approval_threshold_cents:Math.round(threshold*100),...(profile?{require_crs:true,crs_profile_id:profile}:{})})}>Review with safeguards</button></details>;
}
