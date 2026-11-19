'use strict';

const DEFAULTS = Object.freeze({
  coolantCpKJkgK: 3.6, thermalCapacityKJPerK: 180,
  nominalFlowLpm: 28, flowRpmCoefficient: 0.006,
  nominalUAkWK: 0.17, engineHeatFraction: 0.32,
  nominalBrakePowerAt2000kW: 60, otherLossBaseKW: 0.5,
  otherLossSlopeKWPerK: 0.005, nominalTemperatureC: 90,
  maxTemperatureC: 145, minTemperatureMarginC: 5
});
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function normalizeInputs(input={}) {
  return {
    rpm:clamp(Number(input.rpm??2000),700,6500),
    load:clamp(Number(input.load??0.45),0.05,1),
    ambientC:clamp(Number(input.ambientC??30),-10,50),
    vehicleKph:clamp(Number(input.vehicleKph??60),0,180),
    dtSeconds:clamp(Number(input.dtSeconds??60),0,600)
  };
}
function faultFactors(fault='normal') {
  const f={pump:1,fan:1,radiator:1,thermostat:1,temperatureBiasC:0,temperatureQuality:'GOOD'};
  switch(fault) {
    case 'pump': f.pump=0.60; break;
    case 'fan': f.fan=0.50; break;
    case 'radiator': f.radiator=0.65; break;
    case 'thermostat': f.thermostat=0.55; break;
    case 'sensor_bias': f.temperatureBiasC=8; break;
    case 'sensor_dropout': f.temperatureQuality='BAD'; break;
    case 'normal': break;
    default: throw new Error(`Unsupported fault: ${fault}`);
  }
  return f;
}
function stepPlant(state,rawInputs,fault='normal',params=DEFAULTS) {
  const x=normalizeInputs(rawInputs),f=faultFactors(fault);
  const pBrakeKW=params.nominalBrakePowerAt2000kW*(x.rpm/2000)*x.load;
  const qEngineKW=pBrakeKW*params.engineHeatFraction;
  const flowLpm=(params.nominalFlowLpm+params.flowRpmCoefficient*x.rpm)*f.pump;
  const flowEffectiveness=clamp(Math.sqrt(flowLpm/40),0.45,1.15);
  const fanCommand=clamp((state.temperatureC-84)/13,0,1);
  const ramAir=x.vehicleKph/180;
  const airFactor=0.50+0.30*ramAir+0.40*fanCommand*f.fan;
  const uaKWPerK=params.nominalUAkWK*f.radiator*f.thermostat*airFactor*flowEffectiveness;
  const meanCoolantC=state.temperatureC-3;
  const qRadiatorKW=Math.max(0,uaKWPerK*(meanCoolantC-x.ambientC));
  const qOtherKW=params.otherLossBaseKW+Math.max(0,state.temperatureC-x.ambientC)*params.otherLossSlopeKWPerK;
  const netHeatKW=qEngineKW-qRadiatorKW-qOtherKW;
  state.temperatureC=clamp(state.temperatureC+netHeatKW*x.dtSeconds/params.thermalCapacityKJPerK,x.ambientC+params.minTemperatureMarginC,params.maxTemperatureC);
  const deltaCoolantK=qEngineKW/Math.max((flowLpm/60)*1.0*params.coolantCpKJkgK,0.1);
  const trueOutletC=state.temperatureC,trueInletC=trueOutletC-deltaCoolantK;
  const measuredOutletC=f.temperatureQuality==='GOOD'?trueOutletC+f.temperatureBiasC:null;
  return {...x,pBrakeKW,qEngineKW,flowLpm,fanCommand,uaKWPerK,qRadiatorKW,qOtherKW,netHeatKW,trueInletC,trueOutletC,measuredOutletC,temperatureQuality:f.temperatureQuality,fault};
}
function stepTwin(state,rawInputs,params=DEFAULTS) {
  // The twin is intentionally fault-free and does not consume plant measurements.
  return stepPlant(state,rawInputs,'normal',params);
}
function calculateResiduals(plant,twin) {
  const tempResidualC=plant.measuredOutletC==null?null:plant.measuredOutletC-twin.trueOutletC;
  return {tempResidualC,flowResidualLpm:plant.flowLpm-twin.flowLpm,heatResidualKW:plant.qRadiatorKW-twin.qRadiatorKW};
}
function classifyDiagnostics(plant,twin,residuals,persistence={}) {
  const quality=plant.temperatureQuality;
  if(quality!=='GOOD') {
    const thermalAlarm=plant.trueOutletC>=110;
    return {state:'DATA_QUALITY',severity:thermalAlarm?'HIGH':'WARNING',hypothesis:'Coolant temperature measurement unavailable or invalid',confidence:0.99,evidence:[`Temperature quality = ${quality}`,...(thermalAlarm?[`Plant model internal temperature ${plant.trueOutletC.toFixed(1)} °C — high-temperature condition cannot be ruled out`]:[])]};
  }
  if(Math.abs(residuals.tempResidualC??0)>=5&&Math.abs(plant.trueOutletC-twin.trueOutletC)<3&&Math.abs(residuals.flowResidualLpm)<2&&Math.abs(residuals.heatResidualKW)<2)
    return {state:'DEVIATION',severity:'WARNING',hypothesis:'Temperature sensor bias suspected',confidence:0.85,evidence:[`Temperature residual ${residuals.tempResidualC.toFixed(1)} °C`,'Hydraulic and radiator-duty residuals remain small']};
  const hot=plant.trueOutletC-twin.trueOutletC;
  if(persistence.hot&&hot>3&&residuals.flowResidualLpm<-5)
    return {state:'FAULT_SUSPECTED',severity:(plant.trueOutletC>=110||hot>12)?'HIGH':'WARNING',hypothesis:'Coolant pump degradation suspected',confidence:0.78,evidence:[`Temperature residual ${hot.toFixed(1)} °C`,`Flow residual ${residuals.flowResidualLpm.toFixed(1)} L/min`]};
  if(persistence.hot&&hot>3&&Math.abs(residuals.flowResidualLpm)<2&&plant.flowLpm>twin.flowLpm*0.85)
    return {state:'FAULT_SUSPECTED',severity:(plant.trueOutletC>=110||hot>12)?'HIGH':'WARNING',hypothesis:'Radiator / fan / thermostat heat-rejection degradation suspected',confidence:0.70,evidence:[`Temperature residual ${hot.toFixed(1)} °C`,`Radiator-duty residual ${residuals.heatResidualKW.toFixed(1)} kW`]};
  if(plant.trueOutletC>=110)
    return {state:'ALARM',severity:'HIGH',hypothesis:'High coolant temperature',confidence:0.99,evidence:[`Plant outlet temperature ${plant.trueOutletC.toFixed(1)} °C`]};
  return {state:'NORMAL',severity:'NONE',hypothesis:'No significant deviation detected',confidence:0.90,evidence:['Residuals within demonstration limits']};
}
function createSimulation() {
  return {minute:0,plantState:{temperatureC:90},twinState:{temperatureC:90},history:[],persistence:{hot:false}};
}
function advance(sim,inputs,fault='normal',dtSeconds=60) {
  const x={...inputs,dtSeconds},plant=stepPlant(sim.plantState,x,fault),twin=stepTwin(sim.twinState,x);
  sim.minute+=dtSeconds/60;
  const residuals=calculateResiduals(plant,twin);
  sim.persistence.hot=plant.trueOutletC-twin.trueOutletC>3;
  const diagnostic=classifyDiagnostics(plant,twin,residuals,sim.persistence);
  const sample={minute:sim.minute,plant,twin,residuals,diagnostic};
  sim.history.push(sample); if(sim.history.length>120) sim.history.shift();
  return sample;
}
if(typeof module!=='undefined') module.exports={DEFAULTS,clamp,normalizeInputs,faultFactors,stepPlant,stepTwin,calculateResiduals,classifyDiagnostics,createSimulation,advance};
if(typeof window!=='undefined') window.CoolingModel={DEFAULTS,clamp,normalizeInputs,faultFactors,stepPlant,stepTwin,calculateResiduals,classifyDiagnostics,createSimulation,advance};
