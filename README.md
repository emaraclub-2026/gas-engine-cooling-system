# Gas Engine Cooling System — Digital Twin Prototype

Simulation-first, browser-based prototype for an advanced petrol-engine liquid cooling system.

## Run locally
Open `index.html` in a current Chrome or Edge browser. The prototype is self-contained and runs locally; no physical ECU, sensors, actuators, backend service or internet connection is required.

## Automated tests
Requires Node.js 18 or newer: `node --test tests/model.test.js`.

## Engineering boundary
Release 1 is simulation-only and read-only. Plant simulation and independent healthy twin prediction are separate channels. Parameters, thresholds and fault signatures are illustrative placeholders, not OEM calibration data. Do not use this prototype for vehicle safety, maintenance decisions or real equipment operation.

## Repository structure
`index.html` dashboard; `cooling_model.js` simulation and diagnostics; `tests/` regression tests; `docs/` design baseline and backlog status.