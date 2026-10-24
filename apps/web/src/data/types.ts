export type Stage='GLOBE'|'COUNTRY'|'PIN_SELECTED'|'TRANSITION'|'CITY';
export type Branch='baseline'|'shock'|'shockPlusPolicy'|'noIntervention'|'emergencyLending'|'householdSupport';
export type ShockType='interest_rate'|'rent'|'wages'|'credit'|'tax'|'prices';
export type Scenario={shockType:ShockType;direction:'up'|'down';magnitude:number;durationMonths:number;targetSector:string|null;promptText:string};
export type Snapshot={tick:number;branch:Branch;stateHash:string;sharedSnapshotId:string;kpis:{employment:number;householdCash:number;businessDefaults:number;bankStress:number;publicInterventionCost:number};districts:Record<string,{employmentRate:number;disposableIncomeIndex:number;retailDemandIndex:number;firmOpenRate:number;defaultRate:number}>;firms:{id:string;district:string;open:boolean}[]};
export type FeedItem={id:string;tick:number;level:'macro'|'micro';text:string;delta:number;direction:'up'|'down'|'flat';actorId:string|null;district:string|null;ledgerEventIds:string[];isGood:boolean|null;requiresProposal?:boolean};
export type Building={id:string;x:number;y:number;w:number;d:number;h:number;color:string;district:string;kind:string;name:string};
export type CityLayout={layoutSeed:number;simulationSeed:number;layoutHash:string;districts:{name:string;x:number;y:number}[];buildings:Building[];roads:number[];water:{name:string};parks:{x:number;y:number}[]};
