import {schema,table,t,SenderError} from 'spacetimedb/server';

const publisher=table({name:'publisher'},{identity:t.identity().primaryKey()});
const economy_event=table({name:'economy_event',public:true},{
 key:t.string().primaryKey(),simulation_id:t.string(),sequence:t.u32(),tick:t.u32(),
 event_type:t.string(),actor_id:t.string(),counterparty_id:t.string(),amount_cents:t.f64(),
});
const db=schema({publisher,economy_event});
export default db;
export const init=db.init(ctx=>{ctx.db.publisher.insert({identity:ctx.sender});});
export const ingest_events=db.reducer({batch:t.string()},(ctx,{batch})=>{
 if(!ctx.db.publisher.identity.find(ctx.sender))throw new SenderError('Only the publishing identity may mirror events');
 if(batch.length>100000)throw new SenderError('Batch too large');
 const rows=JSON.parse(batch);
 if(!Array.isArray(rows)||rows.length>100)throw new SenderError('Expected at most 100 events');
 for(const row of rows){
  if(typeof row.simulation_id!=='string'||!/^[-\w]{1,128}$/.test(row.simulation_id)||
    !Number.isSafeInteger(row.sequence)||row.sequence<1||row.sequence>4294967295||
    !Number.isSafeInteger(row.tick)||row.tick<0||row.tick>4294967295||
    row.key!==`${row.simulation_id}:${row.sequence}`||!Number.isSafeInteger(row.amount_cents)||
    !['event_type','actor_id','counterparty_id'].every(k=>typeof row[k]==='string'&&row[k].length<=128))throw new SenderError('Invalid event');
  const previous=ctx.db.economy_event.key.find(row.key);
  if(previous){
   if(['simulation_id','sequence','tick','event_type','actor_id','counterparty_id','amount_cents'].some(k=>previous[k as keyof typeof previous]!==row[k]))throw new SenderError('Conflicting replay');
  }else ctx.db.economy_event.insert(row);
 }
});
