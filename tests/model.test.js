'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../cooling_model.js');
const base={rpm:2000,load:0.45,ambientC:30,vehicleKph:60};

test('normal baseline remains finite and bounded for a 2-hour run',()=>{
 const s=M.createSimulation();let last;
 for(let i=0;i<120;i++) last=M.advance(s,base,'normal',60);
 assert.ok(Number.isFinite(last.plant.trueOutletC));
 assert.ok(last.plant.trueOutletC>=35&&last.plant.trueOutletC<=145);
 assert.ok(Math.abs(last.residuals.tempResidualC)<1e-9);
 assert.equal(last.diagnostic.state,'NORMAL');
});
test('increased engine load increases engine heat input',()=>{
 const a=M.stepPlant({temperatureC:90},base,'normal');
 const b=M.stepPlant({temperatureC:90},{...base,load:0.90},'normal');
 assert.ok(b.qEngineKW>a.qEngineKW);
});
test('ambient temperature and vehicle speed are bounded and model stays finite',()=>{
 for(const ambientC of [-10,50]) for(const vehicleKph of [0,180]) {
  const s=M.createSimulation(),r=M.advance(s,{...base,ambientC,vehicleKph},'normal',60);
  for(const v of [r.plant.trueOutletC,r.plant.flowLpm,r.plant.qRadiatorKW,r.twin.trueOutletC]) assert.ok(Number.isFinite(v));
 }
});
test('pump degradation produces a negative flow residual and a pump hypothesis',()=>{
 const s=M.createSimulation();let r;
 for(let i=0;i<40;i++) r=M.advance(s,base,'pump',60);
 assert.ok(r.residuals.flowResidualLpm<-5);
 assert.match(r.diagnostic.hypothesis,/pump/i);
});
test('fan and radiator faults create thermal deviation from independent twin',()=>{
 for(const fault of ['fan','radiator','thermostat']) {
  const s=M.createSimulation();let r;
  for(let i=0;i<60;i++) r=M.advance(s,{...base,load:0.75},fault,60);
  assert.ok(r.plant.trueOutletC>r.twin.trueOutletC,`${fault} should run hotter than healthy twin`);
  assert.match(r.diagnostic.hypothesis,/heat-rejection degradation/i);
 }
});
test('temperature sensor bias is detected without changing plant thermal state',()=>{
 const s=M.createSimulation();let r;
 for(let i=0;i<5;i++) r=M.advance(s,base,'sensor_bias',60);
 assert.ok(Math.abs(r.residuals.tempResidualC-8)<1e-6);
 assert.match(r.diagnostic.hypothesis,/sensor bias/i);
});
test('sensor dropout is surfaced as a data-quality condition, not a thermal value',()=>{
 const s=M.createSimulation(),r=M.advance(s,base,'sensor_dropout',60);
 assert.equal(r.plant.measuredOutletC,null);
 assert.equal(r.diagnostic.state,'DATA_QUALITY');
});
test('invalid fault identifiers fail explicitly',()=>{
 assert.throws(()=>M.stepPlant({temperatureC:90},base,'invented_fault'),/Unsupported fault/);
});
test('high coolant temperature is a high-severity alarm',()=>{
 const s=M.createSimulation();let r;
 for(let i=0;i<90;i++) r=M.advance(s,{rpm:4500,load:0.90,ambientC:40,vehicleKph:0},'normal',60);
 assert.ok(r.plant.trueOutletC>=110);
 assert.equal(r.diagnostic.severity,'HIGH');
});
test('sensor dropout does not suppress a high-temperature severity warning',()=>{
 const s=M.createSimulation();let r;
 for(let i=0;i<90;i++) r=M.advance(s,{rpm:4500,load:0.90,ambientC:40,vehicleKph:0},'sensor_dropout',60);
 assert.equal(r.diagnostic.state,'DATA_QUALITY');
 assert.equal(r.diagnostic.severity,'HIGH');
});
