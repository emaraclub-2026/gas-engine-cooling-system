# Verification Report — Engine Cooling Digital Twin v1.0

**Automated model regression: PASS**

Command: `node --test tests/model.test.js`

- 10 tests executed
- 10 passed
- 0 failed

Coverage: normal two-hour run; load response; ambient/speed boundaries; pump degradation; fan/radiator/thermostat thermal divergence; temperature sensor bias; sensor dropout quality; invalid fault rejection; high-temperature alarm; high-temperature indication during sensor dropout.

The model test suite was executed in the working environment before repository publication. Browser/UI smoke-test claims were not independently re-run as part of this repository commit.

## Baseline observation
An earlier verification run reported approximately 90.5 °C after a two-hour simulated run at 2,000 rpm, 45% load, 30 °C ambient and 60 km/h. This is a model-internal demonstration result, not an OEM or vehicle calibration claim.

## Limitations
Parameters and alarm thresholds are illustrative placeholders. Fault signatures are deterministic demonstration rules, not validated classifiers. No OEM engine map, measured pump/fan curve, physical sensor data, ECU connection or closed-loop actuator control is included. Engineering validation and calibration remain mandatory before operational use.
