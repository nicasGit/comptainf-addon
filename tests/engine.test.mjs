import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, validateRules } from '../myscheduler/engine.mjs';
const now = Date.parse('2026-11-13T12:00:00Z');
const rule = { id:'presence',keyword:'Présence',entity:'climate.salon',temperature:21,endTemperature:17,priority:0 };
const event = { id:'one',summary:'PRÉSENCE maison',start:{dateTime:'2026-11-13T12:00:00Z'},end:{dateTime:'2026-11-13T13:00:00Z'} };
test('start inclusive, end exclusive and case-insensitive match',()=>{
 assert.equal(plan([event],[rule],{},now).desired['climate.salon'].data.temperature,21);
 assert.deepEqual(plan([event],[rule],{},now-1).desired,{});
 assert.deepEqual(plan([event],[rule],{},now+3600000).desired,{});
});
test('priority wins; losing event never resets winning thermostat',()=>{
 const high={...rule,id:'high',temperature:23,priority:2};
 const first=plan([event],[rule,high],{},now);
 assert.equal(first.desired['climate.salon'].data.temperature,23);
 assert.equal(plan([event],[rule],first.active,now).desired['climate.salon'].data.temperature,21);
 assert.equal(plan([],[],first.active,now).desired['climate.salon'].data.temperature,17);
});
test('restart reconciles stored active rule; successful end is not repeated',()=>{
 const active=JSON.parse(JSON.stringify(plan([event],[rule],{},now).active));
 const ended=plan([],[],active,now+3600000);
 assert.equal(ended.desired['climate.salon'].data.temperature,17);
 assert.deepEqual(plan([],[],ended.active,now+3600001).desired,{});
});
test('cancelled and all-day events do not activate rules',()=>{
 assert.deepEqual(plan([{...event,status:'cancelled'},{...event,start:{date:'2026-11-13'}}],[rule],{},now).desired,{});
});
test('timezone offsets refer to actual instants',()=>{
 assert.equal(plan([{...event,start:{dateTime:'2026-11-13T13:00:00+01:00'}}],[rule],{},now).desired['climate.salon'].data.temperature,21);
});
test('configuration rejects duplicate IDs, invalid targets, and unsafe temperatures',()=>{
 assert.doesNotThrow(()=>validateRules([rule]));
 for(const rules of [[rule,rule],[{...rule,entity:'switch.boiler'}],[{...rule,temperature:90}],[{...rule,keyword:''}],[{...rule,priority:0.5}]])assert.throws(()=>validateRules(rules));
});
