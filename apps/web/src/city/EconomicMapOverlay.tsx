import {useMemo} from 'react';
import {Play,Pause,ArrowRight,Layers,Clock,Sparkles,AlertTriangle,Flame,ShieldCheck,Package,Users,Volume2,VolumeX,Video,Thermometer} from 'lucide-react';
import {useStore} from '../state/store';
import {useCityView,type LayerFilter} from '../state/cityView';
import {generateDailyNarrative,getCausalChain} from './economicDynamics';
import {isAudioMuted,toggleAudioMute} from './economicAudio';
import {currency} from '../data/api';

export default function EconomicMapOverlay() {
 const store = useStore();
 const view = useCityView();
 const world = store.world;
 const tick = store.tick;
 const events = store.events;

 const narrative = useMemo(() => {
  return generateDailyNarrative(world, events, tick);
 }, [world, events, tick]);

 const causalChain = useMemo(() => {
  return getCausalChain(world, events);
 }, [world, events]);

 const selectedEntity = useMemo(() => {
  if (!world || !store.selected) return null;
  return world.entities.find(e => e.id === store.selected) ?? null;
 }, [world, store.selected]);

 const layers: Array<{key: LayerFilter; label: string; icon: string}> = [
  {key: 'all', label: 'All Layers', icon: '🌐'},
  {key: 'money', label: 'Money Flows', icon: '💵'},
  {key: 'credit', label: 'Credit & Banks', icon: '💳'},
  {key: 'supply', label: 'Supply & Goods', icon: '🏭'},
  {key: 'jobs', label: 'Jobs & Wages', icon: '👥'}
 ];

 const categoryColors = {
  normal: 'border-cyan',
  shock: 'border-crimson shock-pulse',
  warning: 'border-amber',
  default: 'border-red',
  rescue: 'border-gold rescue-glow',
  supply: 'border-emerald'
 };

 return (
  <div className="economic-map-overlay" aria-label="Interactive economic map HUD">
   {/* Top Center: What Changed This Day? Causal Narrative Banner */}
   <div className={`causal-narrative-banner ${categoryColors[narrative.category] || 'border-cyan'}`}>
    <div className="causal-topline">
     <div className="causal-day-pill">
      <span className="tiny-pulse-dot" />
      DAY {String(tick).padStart(2, '0')} · {store.playing ? 'RUNNING' : 'PAUSED'}
     </div>
     <span className="causal-category-tag">
      {narrative.category.toUpperCase()}
     </span>
     <button
      className="causal-chain-toggle-btn"
      onClick={() => view.setShowCausalChain(prev => !prev)}
      title="Toggle step-by-step causal chain explanation"
     >
      {view.showCausalChain ? '▲ Close Causal Chain' : '▼ What Caused This?'}
     </button>
    </div>

    <div className="causal-body">
     <span className="causal-icon" aria-hidden="true">{narrative.icon}</span>
     <div className="causal-text-block">
      <h3 className="causal-headline">{narrative.headline}</h3>
      <p className="causal-subtext">{narrative.subtext}</p>
     </div>
    </div>
   </div>

   {/* Expandable Causal Chain Drawer */}
   {view.showCausalChain && (
    <div className="causal-chain-drawer" role="region" aria-label="Economic Causal Chain Reaction">
     <div className="causal-drawer-header">
      <div className="drawer-title">
       <Sparkles size={14} className="gold-icon" />
       ECONOMIC CAUSAL TIMELINE & TRANSMISSION MECHANISMS
      </div>
      <button
       className="drawer-close-btn"
       onClick={() => view.setShowCausalChain(false)}
       aria-label="Close causal timeline"
      >
       ✕
      </button>
     </div>

     <div className="causal-cards-scroller">
      {causalChain.map((item, index) => (
       <div className={`causal-card ${item.type}`} key={`${item.tick}-${index}`}>
        <div className="card-topline">
         <span className="card-step-badge">STEP {index + 1}</span>
         <span className="card-tick-badge">DAY {item.tick}</span>
        </div>
        <div className="card-header">
         <span className="card-icon">{item.icon}</span>
         <strong>{item.title}</strong>
        </div>
        <div className="card-row">
         <span className="card-label">TRIGGER:</span>
         <span className="card-value">{item.trigger}</span>
        </div>
        <div className="card-row">
         <span className="card-label">MECHANISM:</span>
         <span className="card-value">{item.mechanism}</span>
        </div>
        <div className="card-row consequence">
         <span className="card-label">CONSEQUENCE:</span>
         <span className="card-value">{item.consequence}</span>
        </div>
       </div>
      ))}
     </div>
    </div>
   )}

   {/* Top Right: Economic Layer Filter Toolbar & Mode Toggles */}
   <div className="map-layer-toolbar" role="toolbar" aria-label="Map Layer Filter">
    <div className="toolbar-label">
     <Layers size={11} /> LAYERS
    </div>
    <div className="layer-button-group">
     {layers.map(layer => (
      <button
       key={layer.key}
       className={`layer-btn ${view.activeLayer === layer.key ? 'active' : ''}`}
       onClick={() => view.setActiveLayer(layer.key)}
       title={`Filter map visuals to ${layer.label}`}
      >
       <span className="layer-emoji">{layer.icon}</span>
       <span className="layer-text">{layer.label}</span>
      </button>
     ))}
    </div>

    <div className="toolbar-divider" />

    <div className="map-quick-toggles">
     <button
      className={`quick-toggle-btn ${view.tourActive ? 'active' : ''}`}
      onClick={() => view.setTourActive(!view.tourActive)}
      title="Automated aerial camera tour highlighting macroeconomic contagion and recovery"
     >
      <Video size={11} />
      <span>{view.tourActive ? 'STOP TOUR' : 'TOUR'}</span>
     </button>

     <button
      className={`quick-toggle-btn ${view.heatmapActive ? 'active' : ''}`}
      onClick={() => view.setHeatmapActive(!view.heatmapActive)}
      title="Toggle district economic stress heatmap overlay"
     >
      <Thermometer size={11} />
      <span>HEATMAP</span>
     </button>

     <button
      className={`quick-toggle-btn ${view.soundEnabled ? 'active' : ''}`}
      onClick={() => {
       const muted = toggleAudioMute();
       view.setSoundEnabled(!muted);
      }}
      title="Toggle procedural economic event audio feedback"
     >
      {view.soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
      <span>{view.soundEnabled ? 'SOUND ON' : 'MUTED'}</span>
     </button>
    </div>
   </div>

   {/* Bottom Center: Paced Replay & Slow Motion Controls */}
   <div className="map-playback-toolbar" role="toolbar" aria-label="Playback Controls">
    <button
     className="map-play-btn"
     disabled={store.busy}
     onClick={store.togglePlay}
     title={store.playing ? 'Pause simulation' : 'Play simulation'}
    >
     {store.playing ? <Pause size={14} /> : <Play size={14} />}
     <span>{store.playing ? 'PAUSE' : 'PLAY'}</span>
    </button>

    <button
     className="map-step-btn"
     disabled={store.busy}
     onClick={store.advance}
     title="Step forward exactly one simulation day"
    >
     <ArrowRight size={14} />
     <span>STEP 1 DAY</span>
    </button>

    <div className="speed-pills">
     {[0.5, 1, 2, 4].map(speed => (
      <button
       key={speed}
       className={`speed-pill ${store.speed === speed ? 'active' : ''}`}
       onClick={() => void store.changeSpeed(speed)}
       title={speed === 0.5 ? 'Slow Motion (0.5×) · Paced event analysis' : `${speed}× playback speed`}
      >
       {speed === 0.5 ? '0.5× SLOW-MO' : `${speed}×`}
      </button>
     ))}
    </div>
   </div>

   {/* Selected Entity Quick HUD Card */}
   {selectedEntity && (
    <div className="entity-quick-hud" role="complementary" aria-label={`Inspection HUD for ${selectedEntity.name}`}>
     <div className="hud-topline">
      <div>
       <span className="hud-kind">{selectedEntity.kind.toUpperCase()}</span>
       <h4 className="hud-name">{selectedEntity.name}</h4>
      </div>
      <span className={`hud-status-badge ${selectedEntity.status}`}>
       {selectedEntity.status.toUpperCase()}
      </span>
     </div>

     <div className="hud-metrics-grid">
      <div className="hud-metric">
       <span>CASH</span>
       <strong>{currency(selectedEntity.balance_sheet.assets.deposit ?? selectedEntity.balance_sheet.assets.reserves ?? 0)}</strong>
      </div>
      <div className="hud-metric">
       <span>ASSETS</span>
       <strong>{currency(selectedEntity.balance_sheet.assets_cents)}</strong>
      </div>
      <div className="hud-metric">
       <span>DEBT</span>
       <strong>{currency(selectedEntity.balance_sheet.liabilities_cents)}</strong>
      </div>
      <div className="hud-metric">
       <span>EQUITY</span>
       <strong>{currency(selectedEntity.balance_sheet.equity_cents)}</strong>
      </div>
     </div>

     {selectedEntity.kind === 'bank' && (
      <div className="hud-bank-specifics">
       <div className="hud-car-bar-wrapper">
        <div className="hud-car-labels">
         <span>CAPITAL ADEQUACY RATIO</span>
         <strong style={{color: (selectedEntity.capital_ratio ?? 0) >= 0.12 ? '#34d399' : (selectedEntity.capital_ratio ?? 0) >= 0.08 ? '#f59e0b' : '#ef4444'}}>
          {((selectedEntity.capital_ratio ?? 0) * 100).toFixed(1)}% CAR
         </strong>
        </div>
        <div className="hud-car-track">
         <div
          className="hud-car-fill"
          style={{
           width: `${Math.max(0, Math.min(100, ((selectedEntity.capital_ratio ?? 0) / 0.2) * 100))}%`,
           background: (selectedEntity.capital_ratio ?? 0) >= 0.12 ? '#34d399' : (selectedEntity.capital_ratio ?? 0) >= 0.08 ? '#f59e0b' : '#ef4444'
          }}
         />
        </div>
       </div>
       <div className="hud-status-line">
        <span>Lending: <strong>{selectedEntity.lending_available ? 'Active / Unconstrained' : 'Frozen / Liquidity Locked'}</strong></span>
       </div>
      </div>
     )}

     {selectedEntity.kind === 'business' && (
      <div className="hud-firm-specifics">
       <div className="hud-stat-pills">
        <span className="hud-pill">📦 Stock: {selectedEntity.goods_units ?? 0} units</span>
        <span className="hud-pill">🪵 Materials: {selectedEntity.materials_units ?? 0} units</span>
        <span className="hud-pill">👥 Staff: {selectedEntity.employees?.length ?? 0}</span>
       </div>
      </div>
     )}

     <button className="hud-dismiss-btn" onClick={() => store.set({selected: null})}>
      Dismiss HUD ×
     </button>
    </div>
   )}
  </div>
 );
}
