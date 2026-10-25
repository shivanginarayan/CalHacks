import type {Building,CityLayout} from '../data/types';
import type {World,Entity,EconomyEvent} from '../data/api';
import {currency} from '../data/api';
import {project,buildingCenter,type Point} from './cityGeometry';
import type {LayerFilter} from '../state/cityView';

export interface DynamicParticle {
 id: string;
 from: Point;
 to: Point;
 type: 'salary' | 'purchase' | 'loan' | 'interbank' | 'rescue';
 color: string;
 amountCents?: number;
 phase: number;
 speed: number;
 label?: string;
}

export interface ShockWaveEffect {
 id: string;
 bankId: string;
 center: Point;
 startTime: number;
 duration: number; // in seconds
 maxRadius: number;
 lossCents: number;
 lossBps: number;
}

export interface CausalMilestone {
 tick: number;
 sequence: number;
 type: 'shock' | 'payroll_missed' | 'business_default' | 'job_loss' | 'rescue' | 'supply' | 'baseline';
 icon: string;
 title: string;
 trigger: string;
 mechanism: string;
 consequence: string;
 amountCents?: number;
}

export interface DailyNarrative {
 headline: string;
 subtext: string;
 category: 'normal' | 'shock' | 'warning' | 'default' | 'rescue' | 'supply';
 icon: string;
}

export interface BuildingOverlayData {
 buildingId: string;
 entityId: string;
 entityName: string;
 entityKind: string;
 worldRoof: Point;
 capitalRatio?: number | null;
 liquidityRatio?: number | null;
 lendingAvailable?: boolean | null;
 isStressed?: boolean;
 goodsUnits?: number | null;
 materialsUnits?: number | null;
 employeesCount?: number;
 missedPayroll?: boolean;
 isClosed?: boolean;
 status: string;
}

export function buildEntityBuildingMap(layout: CityLayout, bound: Map<string, Entity>): Map<string, Building> {
 const map = new Map<string, Building>();
 for (const [bId, entity] of bound.entries()) {
  const b = layout.buildings.find(x => x.id === bId);
  if (b) map.set(entity.id, b);
 }
 return map;
}

export function getBuildingRoofPoint(b: Building): Point {
 return project(b.x + b.w / 2, b.y + b.d / 2, b.h + (b.elevation ?? 0));
}

export function generateDailyNarrative(
 world: World | null,
 events: EconomyEvent[],
 currentTick: number
): DailyNarrative {
 if (!world) {
  return {
   headline: 'Connecting to real-time economic simulation…',
   subtext: 'Double-entry balance sheets and autonomous market agents initializing.',
   category: 'normal',
   icon: '🌐'
  };
 }

 const tickEvents = events.filter(e => e.simulation_tick === currentTick);

 // 1. Check for bank asset loss / debt shock on current or latest tick
 const shockEvent = tickEvents.find(e => e.event_type === 'bank_asset_loss' || e.event_type === 'sourced_debt_stress_applied');
 if (shockEvent) {
  const bank = world.entities.find(e => e.id === shockEvent.agent_id);
  const bankName = bank?.name ?? 'Commercial Bank';
  const lossCents = shockEvent.amount_cents ?? 0;
  const lossBps = Number(shockEvent.details?.loss_bps) || 4000;
  const lossPercent = (lossBps / 100).toFixed(0);
  const car = bank?.capital_ratio !== undefined && bank?.capital_ratio !== null ? (bank.capital_ratio * 100).toFixed(1) + '%' : 'below 8%';
  return {
   headline: `💥 ${bankName} suffered a ${lossPercent}% risky asset write-down (${currency(lossCents)})`,
   subtext: `Capital ratio plunged to ${car} · Lending frozen · Depositor accounts at ${bankName} restricted.`,
   category: 'shock',
   icon: '💥'
  };
 }

 // 2. Check for business defaults / job losses on current tick
 const defaults = tickEvents.filter(e => e.event_type === 'business_default');
 if (defaults.length > 0) {
  const firmNames = defaults.map(d => world.entities.find(e => e.id === d.agent_id)?.name ?? d.agent_id).join(', ');
  const totalJobs = defaults.reduce((acc, d) => acc + (Number(d.details?.jobs_lost) || 5), 0);
  return {
   headline: `⛔ Insolvency Cascades: ${firmNames} defaulted after consecutive missed payrolls`,
   subtext: `${totalJobs} workers laid off · Commercial bank loans written off · Consumer demand depressed.`,
   category: 'default',
   icon: '⛔'
  };
 }

 // 3. Check for missed payroll / rejected wage payments
 const salaryRejections = tickEvents.filter(e => e.event_type === 'payment_rejected' && e.details?.purpose === 'salary');
 if (salaryRejections.length > 0) {
  const uniqueEmployers = [...new Set(salaryRejections.map(e => e.agent_id))];
  const employerNames = uniqueEmployers.map(id => world.entities.find(e => e.id === id)?.name ?? id).join(', ');
  const unpaidWorkers = salaryRejections.length;
  const totalUnpaid = salaryRejections.reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);
  return {
   headline: `⚠️ Liquidity Contagion: ${employerNames} missed payroll for ${unpaidWorkers} workers`,
   subtext: `${currency(totalUnpaid)} in wages unpaid due to frozen bank deposits · Renter cash reserves depleting.`,
   category: 'warning',
   icon: '⚠️'
  };
 }

 // 4. Check for policy interventions / rescue disbursements
 const rescue = tickEvents.find(e => e.event_type === 'intervention_settled' || e.event_type === 'agent_recommendation_applied');
 if (rescue) {
  const amt = rescue.amount_cents ? currency(rescue.amount_cents) : 'Targeted';
  return {
   headline: `⚡ Central Bank Intervention: ${amt} emergency liquidity facility disbursed`,
   subtext: 'Distressed bank balance sheet reinforced · Deposit freeze lifted · Payroll clearance restored.',
   category: 'rescue',
   icon: '⚡'
  };
 }

 // 5. Check for supply / procurement contract recovery
 const supplyContract = tickEvents.find(e => e.event_type === 'supplier_contract_created' || e.event_type === 'supplier_down_payment');
 if (supplyContract) {
  return {
   headline: '📦 Supply Chain Agreement: Raw materials contract secured',
   subtext: 'Negotiated commercial supply terms approved · Inventory replenished · Production resuming.',
   category: 'supply',
   icon: '📦'
  };
 }

 // 6. Baseline equilibrium / normal daily operations
 const m = world.metrics;
 const employed = m?.employed_households ?? 40;
 const totalHouseholds = m?.households ?? 40;
 const defaultsCount = m?.business_defaults ?? 0;
 const stressedBanks = m?.stressed_banks ?? 0;
 const sold = m?.sold_units_this_tick ?? 0;

 if (stressedBanks > 0 || defaultsCount > 0) {
  return {
   headline: `Day ${currentTick}: Stress Persists · ${stressedBanks} distressed bank${stressedBanks > 1 ? 's' : ''} · ${defaultsCount} business default${defaultsCount > 1 ? 's' : ''}`,
   subtext: `Employment at ${(m.employment_rate * 100).toFixed(1)}% (${employed}/${totalHouseholds} working) · Review policy intervention or inspect affected institutions.`,
   category: 'warning',
   icon: '⚠️'
  };
 }

 return {
  headline: `✨ Day ${currentTick} Equilibrium: ${employed}/${totalHouseholds} employed · All 5 commercial banks solvent`,
  subtext: `Daily market clearing: Consumer retail transactions flowing, steady inventory turnover, 0 unpaid wages.`,
  category: 'normal',
  icon: '✨'
 };
}

export function getCausalChain(world: World | null, events: EconomyEvent[]): CausalMilestone[] {
 if (!world) return [];
 const chain: CausalMilestone[] = [];

 // Baseline milestone
 chain.push({
  tick: 0,
  sequence: 0,
  type: 'baseline',
  icon: '✨',
  title: 'Equilibrium Baseline',
  trigger: 'Initial world state calibrated with real public wage/price indexes',
  mechanism: 'All 5 commercial banks well-capitalized (CAR > 12%); 40/40 households employed',
  consequence: 'Daily wage and retail purchase cycles clear with zero settlement friction.'
 });

 // Scan events for key historical turning points
 for (const e of events) {
  if (e.event_type === 'bank_asset_loss' || e.event_type === 'sourced_debt_stress_applied') {
   const bank = world.entities.find(b => b.id === e.agent_id);
   const lossPct = ((Number(e.details?.loss_bps) || 4000) / 100).toFixed(0);
   chain.push({
    tick: e.simulation_tick,
    sequence: e.sequence,
    type: 'shock',
    icon: '💥',
    title: `Asset Shock: ${bank?.name ?? 'Bank'} Haircut`,
    trigger: `${lossPct}% loss applied to risky asset portfolio (${currency(e.amount_cents ?? 0)})`,
    mechanism: 'Loss directly absorbs bank equity capital; CAR drops below regulatory minimum (8%)',
    consequence: 'Bank classified as distressed/insolvent; interbank and commercial lending frozen.'
   });
  } else if (e.event_type === 'payment_rejected' && e.details?.purpose === 'salary') {
   const employer = world.entities.find(x => x.id === e.agent_id);
   const isFirstForEmployer = !chain.some(c => c.type === 'payroll_missed' && c.tick === e.simulation_tick);
   if (isFirstForEmployer) {
    chain.push({
     tick: e.simulation_tick,
     sequence: e.sequence,
     type: 'payroll_missed',
     icon: '⚠️',
     title: `Credit Contagion: Payroll Interruption`,
     trigger: `${employer?.name ?? 'Business'} cannot access operating deposits at distressed bank`,
     mechanism: 'Employer accounts frozen; double-entry ledger rejects wage disbursements',
     consequence: 'Workers go unpaid for the day; household discretionary consumption plummets.'
    });
   }
  } else if (e.event_type === 'business_default') {
   const business = world.entities.find(x => x.id === e.agent_id);
   chain.push({
    tick: e.simulation_tick,
    sequence: e.sequence,
    type: 'business_default',
    icon: '⛔',
    title: `Insolvency Default: ${business?.name ?? 'Business'}`,
    trigger: `${business?.name ?? 'Business'} defaulted (${String(e.details?.reason ?? '2 days missed payroll')})`,
    mechanism: 'Double-entry liquidation: business shuttered, outstanding bank debt defaulted',
    consequence: '5 workers permanently laid off; business removed from active production network.'
   });
  } else if (e.event_type === 'intervention_settled' || e.event_type === 'agent_recommendation_applied') {
   chain.push({
    tick: e.simulation_tick,
    sequence: e.sequence,
    type: 'rescue',
    icon: '⚡',
    title: 'Central Bank Policy Intervention',
    trigger: 'Public macro-prudential liquidity facility disbursed',
    mechanism: 'Emergency capital injection repairs distressed bank balance sheets',
    consequence: 'Lending unfreezes; commercial deposits restored; wage clearing resumes.'
   });
  } else if (e.event_type === 'supplier_contract_created') {
   chain.push({
    tick: e.simulation_tick,
    sequence: e.sequence,
    type: 'supply',
    icon: '📦',
    title: 'Supply Chain Recovery',
    trigger: 'Autonomous AI agents negotiated commercial supply agreement',
    mechanism: 'Down payment settled via escrow; delivery of 20 raw material units secured',
    consequence: 'Factory production line restarts; finished goods inventory replenished.'
   });
  }
 }

 return chain;
}

export function buildDynamicParticles(
 events: EconomyEvent[],
 entityBuildingMap: Map<string, Building>,
 layer: LayerFilter,
 currentTick: number,
 visualTime: number
): DynamicParticle[] {
 const particles: DynamicParticle[] = [];
 // Look at events from current and previous tick
 const relevantEvents = events.filter(e => e.simulation_tick >= currentTick - 1).slice(-50);

 for (let i = 0; i < relevantEvents.length; i++) {
  const e = relevantEvents[i];
  if (!e.agent_id || !e.counterparty_id) continue;
  const fromB = entityBuildingMap.get(e.agent_id);
  const toB = entityBuildingMap.get(e.counterparty_id);
  if (!fromB || !toB) continue;

  const from = buildingCenter(fromB);
  const to = buildingCenter(toB);

  if (e.event_type === 'salary') {
   if (layer !== 'all' && layer !== 'money' && layer !== 'jobs') continue;
   particles.push({
    id: `salary-${e.sequence}`,
    from,
    to,
    type: 'salary',
    color: '#34d399',
    amountCents: e.amount_cents ?? undefined,
    phase: (visualTime * 0.45 + i * 0.17) % 1,
    speed: 0.45,
    label: 'Wages'
   });
  } else if (e.event_type === 'purchase') {
   if (layer !== 'all' && layer !== 'money') continue;
   particles.push({
    id: `purchase-${e.sequence}`,
    from,
    to,
    type: 'purchase',
    color: '#fbbf24',
    amountCents: e.amount_cents ?? undefined,
    phase: (visualTime * 0.4 + i * 0.19) % 1,
    speed: 0.4,
    label: 'Retail'
   });
  } else if (e.event_type === 'loan_issued' || e.event_type === 'loan_originated' || e.event_type === 'agent_credit_settled') {
   if (layer !== 'all' && layer !== 'credit') continue;
   particles.push({
    id: `loan-${e.sequence}`,
    from,
    to,
    type: 'loan',
    color: '#38bdf8',
    amountCents: e.amount_cents ?? undefined,
    phase: (visualTime * 0.5 + i * 0.23) % 1,
    speed: 0.5,
    label: 'Credit'
   });
  } else if (e.event_type === 'interbank_payment' || e.event_type === 'interbank_cleared') {
   if (layer !== 'all' && layer !== 'credit') continue;
   particles.push({
    id: `interbank-${e.sequence}`,
    from,
    to,
    type: 'interbank',
    color: '#c084fc',
    amountCents: e.amount_cents ?? undefined,
    phase: (visualTime * 0.35 + i * 0.29) % 1,
    speed: 0.35,
    label: 'Netting'
   });
  } else if (e.event_type === 'intervention_settled' || e.event_type === 'agent_recommendation_applied') {
   if (layer !== 'all' && layer !== 'money' && layer !== 'credit') continue;
   particles.push({
    id: `rescue-${e.sequence}`,
    from,
    to,
    type: 'rescue',
    color: '#f59e0b',
    amountCents: e.amount_cents ?? undefined,
    phase: (visualTime * 0.6 + i * 0.31) % 1,
    speed: 0.6,
    label: 'Liquidity Injection'
   });
  }
 }

 return particles;
}
