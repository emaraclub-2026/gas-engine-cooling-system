# Project Baseline — Release 1

- Development mode: simulation-first.
- Engine configuration: generic advanced petrol engine.
- Deployment: local PC / local network.
- Hardware: none; virtual sensors and simulated ECU-style signals.
- Objective: real-time monitoring and diagnostics.
- Control boundary: read-only; no real actuator or ECU commands.
- Model class: reduced-order lumped-parameter thermal-hydraulic simulation.
- Design targets: configurable 0.25 s model step and 1 Hz dashboard refresh.
- Initial target storage: SQLite locally; future PostgreSQL/TimescaleDB migration.
- Proposed target backend: Python/FastAPI; proposed live transport: WebSocket.

## Release 1 scope
Engine coolant jacket, electric coolant pump, radiator, electronic thermostat/control valve, variable-speed fan(s), expansion tank, connecting pipes, configurable heater-core bypass, operating inputs, simulated telemetry, virtual sensors, fault injection, diagnostics, alarms and local dashboard.

## Exclusions
Combustion/cylinder-level simulation, OEM-specific calibration, CAN/OBD or physical vehicle connection, hardware-in-the-loop, closed-loop real actuator control, cloud hosting and enterprise historian integration.

## Diagnostic sequence
Input quality validation → independent twin prediction → residual calculation → mode-dependent thresholds and persistence → fault signatures/competing explanations → hypothesis with evidence/confidence → event/alarm handling.

## Critical engineering rules
1. Plant simulated measurements and independent twin predictions must remain separate.
2. Never display a healthy state when critical input data is stale, bad or unavailable.
3. Simulation-only thresholds must be visibly labelled and must not be represented as OEM limits.
4. Severity and diagnostic confidence are separate attributes.
5. Suspected causes remain hypotheses unless validated evidence supports a confirmed failure.

## Calibration/use limitation
No OEM engine, radiator, pump, fan or thermostat maps are currently available. Generic parameters are development assumptions. The prototype is not approved for real equipment operation, maintenance decisions or safety-critical use.
