# Detailed Design Specification — Release 1 Summary

**System:** Web-Based Digital Twin — Advanced Petrol Engine Cooling System  
**Baseline:** DDS v1.0  
**Development mode:** Simulation-first  
**Deployment:** Local PC / local network  
**Control boundary:** Read-only; no real ECU or actuator commands

## 1. Purpose
Simulate a generic advanced petrol-engine liquid cooling system, calculate expected thermal and hydraulic behaviour, generate virtual telemetry, detect defined abnormal conditions and present results through a local web application.

## 2. System boundary
Included components: engine coolant jacket, electric coolant pump, radiator, electronic thermostat/control valve, variable-speed fan(s), expansion tank, connecting pipes and optional heater-core bypass/load.

Inputs: engine speed, normalized engine load, ambient temperature, vehicle speed and operating mode.

Excluded: combustion/cylinder-level modelling, OEM-specific maps/limits, CAN/OBD or physical vehicle connection, hardware-in-the-loop, real actuator control, cloud hosting, mobile application and enterprise historian integration.

## 3. Model requirements
Use a real-time-capable lumped-parameter model with configurable parameters and explicit calibration status. State variables include effective engine thermal state, coolant inlet/outlet temperatures, radiator hot/cold temperatures and thermal state, coolant mass flow, pump suction/discharge pressure, thermostat opening, pump/fan speed and diagnostic states.

Governing relationships:
- Engine thermal balance: C_eng · dT_eng/dt = Q_to_coolant − Q_other_losses − m_dot_c · Cp · (T_out − T_in)
- Coolant heat transport: Q_coolant = m_dot_c · Cp(T, mixture) · (T_out − T_in)
- Radiator heat rejection: Q_rad = ε · C_min · (T_hot,in − T_air,in)
- Hydraulic system: ΔP_system = K_system · m_dot_c²; ΔP_pump = f(N_pump, m_dot_c)
- Residual: r_i(t) = y_simulated_measurement,i(t) − y_model_prediction,i(t)

Numerical design targets: configurable 0.25 s model integration step; 1 Hz dashboard update; 4 Hz default model calculation. Keep wall-clock and simulation-clock timestamps separate. Use deterministic seeds for repeatable fault/noise tests.

## 4. Fault cases
F-01 pump degradation; F-02 radiator restriction; F-03 fan degradation/failure; F-04 thermostat stuck closed; F-05 thermostat stuck open; F-06 coolant leak/loss; F-07 air entrainment; F-08 temperature sensor bias; F-09 sensor dropout/stale data; F-10 coolant flow sensor bias.

The current prototype implements a subset of these fault cases. Unimplemented cases remain development backlog items.

## 5. Diagnostics and alarms
Processing sequence: validate input quality, timestamp age, range and rate-of-change; update the independent twin; calculate residuals; apply mode-dependent thresholds and persistence; evaluate fault signatures and competing explanations; generate a hypothesis with evidence/confidence; create or update alarm/event.

Severity and confidence must be independent fields. A high-severity thermal condition may have low diagnostic confidence. Do not label a component failure as confirmed without validated evidence. Use persistence/hysteresis to limit alarm chatter. Do not show healthy status when critical measurements are unavailable.

## 6. Target software architecture
Frontend: HTML/CSS/JavaScript initially, React optional.  
Visualization: Three.js or canvas-based 2D/3D.  
Backend: Python + FastAPI.  
Twin engine: Python + NumPy/SciPy.  
Storage: SQLite initially; PostgreSQL/TimescaleDB later.  
Live transport: WebSocket; MQTT adapter reserved for future integration.

Logical flow: scenario controls → plant simulator → simulated sensor/ECU channels → quality validation → independent twin prediction → residuals → diagnostics → event store → API/WebSocket → browser dashboard.

## 7. Data and interface
Retain at least 30 days of telemetry for the local prototype, with configurable cleanup. Keep telemetry samples, twin predictions, scenarios, injected faults, diagnostic events, model parameter sets and system events as distinct records.

The DDS defines REST endpoints for status, simulation start/pause/step/reset, scenario updates, fault injection/clearing, latest/history telemetry, active diagnostics, events and model parameters.

## 8. Acceptance and delivery
The DDS acceptance plan includes normal steady state, load step, hot ambient, pump degradation, fan failure, radiator restriction, thermostat faults, sensor bias, sensor dropout, simulation controls, historical replay and offline local operation.

Delivery gates: G0 design baseline; G1 model baseline; G2 simulation baseline; G3 diagnostic baseline; G4 integrated prototype; G5 prototype acceptance.

## 9. Engineering cautions
No OEM engine, radiator, pump, fan or thermostat maps are available. Generic parameters are assumptions, not design ratings. The current model is not CFD and is not a validated vehicle thermal-management model. Thresholds remain simulation-only until tied to a selected engine specification. Fault signatures can overlap; report probable causes and evidence, not unjustified certainty. Real-engine integration requires signal mapping, calibration, sensor accuracy assessment and a safe read-only interface.

**Important:** This summary records the DDS baseline. It does not imply that every target-architecture item has been implemented in the current browser prototype.
