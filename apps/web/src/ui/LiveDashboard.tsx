import {useEffect,useState} from 'react';
import {Play,Pause,Plus,RotateCcw,GitFork,ArrowLeft,ArrowRight,Building2,Network as NetworkIcon} from 'lucide-react';
import {useStore} from '../state/store';
import {api,currency} from '../data/api';
import type {Metrics,Entity,Report,ComparisonEvidence,EconomyEvent} from '../data/api';
import {comparisonReport,downloadComparison} from '../data/comparisonReport';
import IntegrationsPanel from './IntegrationsPanel';
import {WorldDataOptions,CreditSafeguards} from './TrackControls';
import ShockStory from './ShockStory';
import PublicDataPanel from './PublicDataPanel';

export const strategyName:Record<string,string> = {no_intervention:'No intervention',bank_lending:'Emergency bank lending',household_cash:'Direct household support'};
const activeJob = (status?:string) => status === 'queued' || status === 'running';

export function TopControls(){const s=useStore();return <div className="top-controls">
 <div className="control-group"><button disabled={s.busy} onClick={s.createWorld}><Plus size={14}/>Create World</button>
 <button disabled={s.busy} onClick={s.togglePlay}>{s.playing?<Pause size={14}/>:<Play size={14}/>} {s.playing?'Pause':'Play'}</button>
 <select aria-label="Playback speed" disabled={s.busy} value={s.speed} onChange={e=>void s.changeSpeed(+e.target.value)}>{[1,2,4].map(n=><option key={n} value={n}>{n}×</option>)}</select>
 <button disabled={s.busy} title="Preserve history and reset into a new world" aria-label="Reset world" onClick={s.reset}><RotateCcw size={14}/></button></div>
 <div className="control-group"><span className="month-label">DAY <b>{String(s.tick).padStart(2,'0')}</b></span>
 <div className="segmented view-toggle"><button className={s.mode==='city'?'active':''} onClick={()=>s.set({mode:'city',compare:false})}><Building2 size={12}/>City</button><button className={s.mode==='network'?'active':''} onClick={()=>s.set({mode:'network',compare:false})}><NetworkIcon size={12}/>Network</button></div>
 <button disabled={s.busy} className="fork-button" onClick={s.compareFutures}><GitFork size={14}/>Fork Reality</button></div></div>;}

export function KpiStrip(){const s=useStore(),m=s.world?.metrics;if(!m)return null;
 const rows=[['Employment',`${(m.employment_rate*100).toFixed(1)}%`],['Household Cash',currency(m.household_cash_cents)],
 ['Business Defaults',m.business_defaults],['Bank Stress',`${m.stressed_banks} / ${m.banks} banks`],['Public Intervention Cost',currency(m.public_support_disbursed_cents)]];
 return <div className="kpi-strip">{rows.map(([label,value])=><div className="kpi" key={label}><span>{label}</span><strong>{value}</strong><small>Backend state · Day {s.tick}</small></div>)}</div>;}

export function Timeline(){const s=useStore();return <div className="timeline"><button disabled={s.busy} aria-label="Step one day" onClick={s.advance}><ArrowRight size={17}/></button>
 <div className="timeline-track"><div><span>DAY {s.tick} · {s.playing?'RUNNING':'PAUSED'}</span><span>1 TICK = 1 DAY</span></div>
 <div className="history-bars" aria-label="Employment history">{s.history.slice(-80).map(m=><i key={m.simulation_tick} title={`Day ${m.simulation_tick}: ${(m.employment_rate*100).toFixed(1)}% employed`} style={{height:`${Math.max(3,m.employment_rate*30)}px`}}/>)}</div></div>
 <span className="badge">{s.world?.config.scenario.replaceAll('_',' ')} · seed {s.world?.config.seed}</span></div>;}

function Crisis(){const s=useStore(),banks=s.world?.entities.filter(e=>e.kind==='bank')??[];
 const [bank,setBank]=useState('bank_1'),[loss,setLoss]=useState(40),[open,setOpen]=useState(false);
 return <section className="crisis-section"><button className="crisis-heading" onClick={()=>setOpen(!open)}><span>Trigger Crisis<small>Write down a bank's risky assets.</small></span><span>{open?'−':'+'}</span></button>
 {open&&<div className="crisis-form"><label>Institution<select aria-label="Shock bank" value={bank} onChange={e=>setBank(e.target.value)}>{banks.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
 <label>Asset category<strong>Risky assets</strong></label><label>Asset loss <b>{loss}%</b><input aria-label="Asset loss" type="range" min="5" max="100" step="5" value={loss} onChange={e=>setLoss(+e.target.value)}/></label>
 <button disabled={s.busy} className="crisis-trigger" onClick={()=>void s.shock(bank,loss)}>Apply bank shock</button><p className="muted">Pauses before settlement. Advance days to observe actual consequences.</p></div>}</section>;}

function AgentProgress(){const s=useStore(),report=s.report,job=s.job;const [applied,setApplied]=useState('');
 const [reason,setReason]=useState(''),[deciding,setDeciding]=useState(false),[approvalError,setApprovalError]=useState('');
 useEffect(()=>setApplied(''),[report?.run_id]);
 if(!job)return null;
 const canApply=report&&(job.kind==='central_bank'?report.status==='completed':job.kind==='credit'?report.status==='approved'&&report.business_accepted:report.status==='ready');
 const source=report?.provider??[...new Set(Object.values(report?.providers??{}))].join(', ');
 return <section className="agent-section" aria-label="Agent job progress"><div className="section-heading"><span>{job.kind.replaceAll('_',' ')} · {job.status}</span><span className="badge">{source||s.agentMode}</span></div>
 <small>Report: {report?.status??'waiting for worker'} · observation day {report?.source_tick??'pending'}</small>
 <p className="muted">{report?.model??[...new Set(Object.values(report?.models??{}))].join(', ')}</p>
 {job.status==='queued'&&<button className="text-action" onClick={s.cancelJob}>Cancel queued job</button>}
 {(job.error||report?.error)&&<p role="alert" className="request-error">{job.error||report?.error}</p>}
 {report?.recommendation&&<div className="proposal"><h3>{strategyName[report.recommendation.strategy]}</h3><p>{report.recommendation.rationale}</p><b>{currency(report.recommendation.amount_cents)} gross support</b></div>}
 {report?.decision&&<p>{report.decision.rationale} · {currency(report.decision.amount_cents)}</p>}
 {report?.risk_evidence&&<p>CRS sandbox score: {report.risk_evidence.score??'unavailable'} · Risk: {report.risk_evidence.risk_decision} · {report.risk_evidence.cached?'cached evidence':'live pull'}</p>}
 {report?.status==='needs_human_approval'&&<div className="sponsor-integrations" role="status"><h3>Human approval required</h3>{report.approval_reasons?.map(r=><p key={r}>{r}</p>)}
 <label>Review rationale<input aria-label="Credit approval rationale" value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)}/></label>
 {(['approve','decline'] as const).map(decision=><button key={decision} disabled={deciding||!reason.trim()} onClick={async()=>{setDeciding(true);setApprovalError('');try{await api(`/api/credit-runs/${report.run_id}/approval`,{decision,rationale:reason.trim()});await s.refresh();}catch(e){setApprovalError(String(e));}finally{setDeciding(false);}}}>{decision==='approve'?'Approve reviewed offer':'Decline reviewed offer'}</button>)}<p>Approval records your decision. Settlement remains a separate confirmation.</p>{approvalError&&<p role="alert">{approvalError}</p>}</div>}
 {report?.human_approval&&<p>Human decision: {report.human_approval.decision} · {report.human_approval.rationale}</p>}
 {report?.offers?.map(offer=><div className="detail-row" key={offer.offer_id}><span>{offer.supplier_id}{offer.offer_id===report.selected_offer?.offer_id?' · SELECTED':''}<small>{offer.quantity} units · due in {offer.due_in_ticks} days</small></span><strong>{currency(offer.total_cents)}<small>{currency(offer.down_payment_cents)} upfront</small></strong></div>)}
 {canApply&&applied!==report!.run_id&&<button className="primary small" disabled={s.busy} onClick={async()=>{await s.settleReport();if(!useStore.getState().error)setApplied(report!.run_id);}}>{job.kind==='central_bank'?'Apply recommendation':job.kind==='credit'?'Settle accepted credit':'Confirm contract and down payment'}</button>}
 {applied===report?.run_id&&<p className="success-line">Settlement confirmed</p>}
 <details className="agent-observations" open={activeJob(job.status)}><summary>Public tool trace ({report?.trace.length??0})</summary>{report?.trace.map(t=><div className="live-trace" key={t.sequence}><b>{t.sequence}. {t.role??'central bank'} · {t.tool} · {t.status}</b>{t.tool==='buy_market_forecast'&&t.status==='accepted'&&typeof (t.result as {transaction_hash?:unknown})?.transaction_hash==='string'&&/^0x[0-9a-fA-F]{64}$/.test((t.result as {transaction_hash:string}).transaction_hash)&&<a target="_blank" rel="noreferrer" href={'https://sepolia.basescan.org/tx/'+(t.result as {transaction_hash:string}).transaction_hash}>View Base Sepolia payment receipt</a>}<pre>{JSON.stringify(t.result,null,2)}</pre></div>)}</details>
 </section>;}

function eventText(type:string){return type.replaceAll('_',' ');}
function EventFeed(){const s=useStore();return <section className="feed"><div className="section-heading"><span>THE RIPPLE EFFECT</span><span className="live-label">{s.connection}</span></div>
 <div className="feed-items">{[...s.events].reverse().slice(0,25).map(e=><button className="feed-item" key={e.sequence} onClick={()=>s.set({selected:e.agent_id??e.counterparty_id})}>
 <span><span className="feed-meta">DAY {e.simulation_tick} · #{e.sequence}</span><span className="feed-text">{eventText(e.event_type)}{e.amount_cents!==null?` · ${currency(e.amount_cents)}`:''}</span>
 <small>{e.agent_id}{e.counterparty_id?` → ${e.counterparty_id}`:''}</small>{typeof e.details.reason==='string'&&<small>{e.details.reason}</small>}</span></button>)}</div></section>;}

function Inspector(){const s=useStore(),entity=s.world?.entities.find(e=>e.id===s.selected);
 const [transactions,setTransactions]=useState<{transaction_id:string;metadata:{type?:string;tick?:number}}[]>([]);
 useEffect(()=>{let current=true;setTransactions([]);if(!s.world||!entity)return;const id=s.world.simulation_id;
  void api<{transactions:{transaction_id:string;metadata:{type?:string;tick?:number};lines:{account_id:string}[]}[]}>(`/api/worlds/${id}/transactions?entity_id=${encodeURIComponent(entity.id)}&newest_first=true&limit=12`).then(page=>{
   if(current)setTransactions(page.transactions);
  }).catch(()=>{});return()=>{current=false;};},[s.world?.simulation_id,s.tick,entity?.id]);
 if(!entity)return <button className="text-action" onClick={()=>s.set({selected:null})}>Return to events</button>;
 const related=s.contracts.filter(c=>c.buyer_id===entity.id||c.supplier_id===entity.id);
 const sheet=entity.balance_sheet;
 return <div className="inspector"><button className="text-action" onClick={()=>s.set({selected:null})}><ArrowLeft size={14}/> Back to live events</button>
 <p className="eyebrow">{entity.kind} · DAY {s.tick}</p><h2>{entity.name}</h2><code>{entity.id}</code><p className="status-chip">{entity.status}</p>
 <div className="balance-grid">{[['Cash',sheet.assets.deposit??sheet.assets.reserves??0],['Assets',sheet.assets_cents],['Debt',sheet.liabilities_cents]].map(([name,value])=><div key={name}><span>{name}</span><strong>{currency(+value)}</strong></div>)}</div>
 <p>Equity {currency(sheet.equity_cents)} · Ledger {sheet.balanced?'balanced':'unbalanced'}</p>
 {entity.kind==='bank'&&<p>Capital {((entity.capital_ratio??0)*100).toFixed(1)}% · Liquidity {((entity.liquidity_ratio??0)*100).toFixed(1)}% · Lending {entity.lending_available?'available':'constrained'}</p>}
 {entity.kind==='business'&&<><div className="detail-row"><span>Raw materials / finished goods</span><b>{entity.materials_units??'untracked'} / {entity.goods_units??'untracked'}</b></div><p>{entity.employees?.length??0} employees · Produced {entity.last_produced_units??'untracked'} goods today</p>
 <div className="button-row"><button className="primary small" disabled={s.busy||activeJob(s.job?.status)||entity.status!=='active'} onClick={()=>void s.startJob('credit',entity.id)}>Review payroll credit</button>
 <button className="quiet" disabled={s.busy||activeJob(s.job?.status)||entity.status!=='active'} onClick={()=>void s.startJob('procurement',entity.id)}>Negotiate supplies</button></div><CreditSafeguards key={entity.id} businessId={entity.id}/><p className="muted">Supplies: 20 units · maximum full invoice $1,000. Preview first, then confirm settlement.</p></>}
 <div className="section-heading"><span>CONNECTED INSTITUTIONS</span></div>{[entity.bank_id,entity.employer_id,...(entity.employees??[])].filter(Boolean).map(id=><button className="relationship" key={id} onClick={()=>s.set({selected:id!})}>{s.world?.entities.find(e=>e.id===id)?.name??id} →</button>)}
 <div className="section-heading"><span>SUPPLIER OBLIGATIONS</span></div>{related.length?related.map(c=><div className="detail-row" key={c.contract_id}><span>{c.status}<small>{c.buyer_id} → {c.supplier_id} · due day {c.due_tick}</small></span><b>{currency(c.outstanding_cents)}</b></div>):<p className="muted">No supplier contracts.</p>}
 {(s.report?.business_id===entity.id||s.report?.buyer_id===entity.id)&&<AgentProgress/>}
 <div className="section-heading"><span>RECENT LEDGER ENTRIES</span></div>{transactions.map(t=><div className="detail-row" key={t.transaction_id}><span>{t.metadata.type}<small>Day {t.metadata.tick} · {t.transaction_id}</small></span></div>)}
 </div>;}

export default function LivePanel(){const s=useStore(),city=s.stage==='CITY';const [paid,setPaid]=useState(false);useEffect(()=>setPaid(false),[s.world?.simulation_id]);return <aside className="side-panel"><div className="panel-scroll">
 <div className="panel-topline"><span className="eyebrow">{city?'CONNECTED ECONOMY':'CHOOSE YOUR EXPERIMENT'}</span><span className="badge">{city?'BACKEND DATA':'SAN FRANCISCO VISUAL'}</span></div>
 {!city?<><div className="city-heading"><div><h1>San Francisco</h1><p>A stylized city for your simulated economy.</p></div></div><p className="panel-intro">Healthy economy → bank shock → consequences → intervention → compare futures.</p>
 <label className="slider-label">Starting world<select aria-label="Starting scenario" value={s.selectedScenario} onChange={e=>s.set({selectedScenario:e.target.value})}><option value="credit_crunch">Credit crunch · bank crisis demo</option><option value="standard">Standard · well-capitalized banks</option><option value="supply_crunch">Supply crunch · inventory recovery</option></select></label>
 <WorldDataOptions/><PublicDataPanel/><p className="muted">Seed 42 · 40 households · 8 businesses · 5 banks. Institutions and financial balances are simulated; public price/wage references have separate provenance.</p><button disabled={s.busy} className="primary" onClick={s.createWorld}>{s.busy?'Creating world…':'Create and explore economy'} <ArrowRight size={16}/></button>
 <p className="muted">Current experiments support bank asset losses and supplier shortages. Interest-rate, rent, and tax scenarios are not implemented.</p></>:
 s.selected?<Inspector/>:<><h2>The living economy.</h2><p className="muted">{s.world?.simulation_id} · {s.world?.production_model}</p>
 <label className="slider-label">Agent mode<select aria-label="Agent mode" disabled={activeJob(s.job?.status)} value={s.agentMode} onChange={e=>s.set({agentMode:e.target.value as 'demo'|'live'})}><option value="demo">Deterministic demo · no AI inference</option><option value="live" disabled={!s.providerStatus?.live_configured}>Live Nemotron via Nebius</option></select></label>
 <p className="muted">{s.providerStatus?.live_configured?`Configured model: ${s.providerStatus.model}`:'Live mode needs backend NEBIUS_API_KEY and NEBIUS_MODEL.'}</p>
 <label className="muted"><input aria-label="Allow paid testnet research" type="checkbox" checked={paid} disabled={s.agentMode!=='live'||activeJob(s.job?.status)} onChange={e=>setPaid(e.target.checked)}/> Allow one paid research purchase, up to 0.01 Base Sepolia test USDC. Requires the separate configured test wallet.</label>
 {s.world?.calibration&&<p className="muted">Apify inputs: {s.world.calibration.calibration_id} · {s.world.calibration.collected_at}<br/>Snapshot {s.world.calibration.sha256.slice(0,16)}</p>}
 <button className="primary" disabled={s.busy||activeJob(s.job?.status)} onClick={()=>void s.startJob('central_bank',undefined,paid?{allow_paid_research:true}:{})}>Test rescue policies</button><p className="muted">Tests two budgets over 12 days. Maximum gross support $10,000. Pauses the source; applying is a separate action.</p><AgentProgress/><Crisis/>
 <PublicDataPanel key={'data-'+s.world?.simulation_id}/><ShockStory key={'story-'+s.world?.simulation_id}/><IntegrationsPanel key={s.world?.simulation_id}/><details className="institution-list"><summary>Inspect institutions ({s.world?.entities.length})</summary>{s.world?.entities.map(e=><button className="relationship" key={e.id} onClick={()=>s.set({selected:e.id})}>{e.name}<small>{e.kind} · {e.status}</small></button>)}</details><EventFeed/></>}
 </div><div className="panel-footer">{s.busy?'Working…':s.connection} · Simulated ledger · not a forecast</div></aside>;}

export function NetworkView(){const s=useStore(),[edge,setEdge]=useState<number|null>(null);
 const entities=s.world?.entities.filter(e=>e.kind!=='household')??[];
 const nodes=entities.map((e,i)=>({...e,x:450+Math.cos(i/entities.length*Math.PI*2)*280,y:330+Math.sin(i/entities.length*Math.PI*2)*230}));
 const edges=s.network?.exposures??[],selectedEdge=edge===null?undefined:edges[edge];
 return <div className="network-view"><div className="network-heading"><p className="eyebrow">FOLLOW THE EXPOSURE</p><h2>The city is connected.</h2><p>Actual outstanding claims · click an institution or exposure.</p></div><svg viewBox="0 0 900 660" aria-label="Financial network">{edges.map((e,i)=>{const a=nodes.find(n=>n.id===e.borrower_id),b=nodes.find(n=>n.id===e.lender_id);if(!a||!b)return null;return <g className="network-edge" key={i} onClick={()=>setEdge(i)} opacity={!s.selected||s.selected===a.id||s.selected===b.id?1:.2}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="18"/><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={i===edge?'#ffe08a':'#849caa'} strokeWidth="2"/></g>;})}
 {nodes.map(n=><g className="network-node" role="button" aria-label={`Inspect ${n.name}`} tabIndex={0} key={n.id} transform={`translate(${n.x},${n.y})`} onClick={()=>s.set({selected:n.id})} onKeyDown={e=>{if(e.key==='Enter')s.set({selected:n.id});}}><circle r={n.kind==='bank'?29:20} fill="#1a2733" stroke={n.status==='active'?'#a2b9b8':'#ef4444'}/><text textAnchor="middle" y="4" fill="white" fontSize="10">{n.kind==='bank'?'BANK':n.kind==='business'?'FIRM':'PUBLIC'}</text><text textAnchor="middle" y="43" fill="white" fontSize="11">{n.name}</text></g>)}</svg>
 {selectedEdge&&<div className="edge-detail"><span>{selectedEdge.borrower_id} → {selectedEdge.lender_id}</span><b>{currency(selectedEdge.amount_cents)}</b><small>{selectedEdge.kind} · due day {selectedEdge.due_tick??'unscheduled'}</small><button onClick={()=>setEdge(null)}>Dismiss</button></div>}</div>;}

export function BranchCompare(){const s=useStore(),fork=s.fork,[index,setIndex]=useState(0),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');useEffect(()=>{setIndex(0);setExportError('');},[fork?.fork_id]);if(!fork)return null;
 const exportReport=async()=>{if(!s.world)return;setExporting(true);setExportError('');try{
  const [saved,events]=await Promise.all([api<ComparisonEvidence>(`/api/forks/${fork.fork_id}`),api<{events:EconomyEvent[]}>(`/api/worlds/${s.world.simulation_id}/events?limit=1000`)]);
  downloadComparison(comparisonReport(saved,s.world,events.events,s.report),saved.fork_id);
 }catch(error){setExportError(error instanceof Error?error.message:'Comparison export failed');}finally{setExporting(false);}};
 const colors=['#c2cbd4','#e6bd6c','#6dd7be'];
 const metrics:{key:keyof Metrics;title:string;format:(n:number)=>string}[]=[
  {key:'employment_rate',title:'Employment',format:n=>(n*100).toFixed(1)+'%'},
  {key:'business_defaults',title:'Business defaults',format:String},
  {key:'stressed_banks',title:'Stressed banks',format:String},
  {key:'public_support_disbursed_cents',title:'Gross public support',format:currency}];
 return <div className="compare-view"><div className="compare-header"><div><p className="eyebrow">FORK REALITY</p><h2>One world. Three futures.</h2></div><div className="button-row"><button className="dark-quiet" disabled={exporting} onClick={()=>void exportReport()}>{exporting?'Preparing report…':'Download comparison report'}</button><button className="dark-quiet" onClick={()=>s.set({compare:false})}><ArrowLeft size={14}/>Back to city</button></div></div>
 {exportError&&<p role="alert">{exportError}</p>}
 <div className="snapshot-proof">Same source day {fork.source_tick}<code title={fork.snapshot_sha256}>{fork.snapshot_sha256.slice(0,16)}…</code></div>
 <div className="recommendation"><div><span className="badge">RULE-BASED RANKING</span><h3>{strategyName[fork.recommended_strategy]}</h3><p>{fork.recommendation_basis}</p></div></div>
 <div className="comparison-legend">{fork.branches.map((b,i)=><span key={b.strategy}><i style={{background:colors[i]}}/>{strategyName[b.strategy]}</span>)}</div>
 <div className="chart-grid">{metrics.map(m=>{const values=fork.branches.flatMap(b=>b.timeline.map(t=>t[m.key]));const low=Math.min(0,...values),high=Math.max(1,...values);return <div className="comparison-chart" key={m.key}><div><span>{m.title}</span><small>{m.format(high)}</small></div><svg viewBox="0 0 360 180" role="img" aria-label={`${m.title} comparison`}>{fork.branches.map((b,i)=><polyline key={b.strategy} points={b.timeline.map((t,j)=>`${25+j/(b.timeline.length-1)*310},${145-(t[m.key]-low)/(high-low)*115}`).join(' ')} fill="none" stroke={colors[i]} strokeWidth="2.4"/>)}<line x1={25+index/(fork.end_tick-fork.source_tick)*310} x2={25+index/(fork.end_tick-fork.source_tick)*310} y1="25" y2="150" stroke="#ffffff80"/><text x="25" y="168" fill="#aab9c9">Day {fork.source_tick} → {fork.end_tick}</text></svg></div>;})}</div>
 <div className="compare-scrubber"><span>DAY {fork.source_tick+index}</span><input aria-label="Compare day" type="range" min="0" max={fork.end_tick-fork.source_tick} value={index} onChange={e=>setIndex(+e.target.value)}/></div>
 <div className="branch-results">{fork.branches.map((b,i)=>{const m=b.timeline[index];return <div className="live-branch-result" key={b.strategy}><b style={{color:colors[i]}}>{strategyName[b.strategy]}</b><span>{(m.employment_rate*100).toFixed(1)}% employment · {m.business_defaults} defaults</span><span>{currency(m.public_support_disbursed_cents)} support</span></div>;})}</div><p className="compare-footnote">Calculated branches · source unchanged · agent recommendation shown separately in the inspector.</p></div>;}
