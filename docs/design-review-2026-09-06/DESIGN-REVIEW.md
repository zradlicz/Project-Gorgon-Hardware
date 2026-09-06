# Gorgon design review

2026-09-06. Review of the local schematic, PCB, production netlist/BOM, firmware and calibration tool. Hardware observations apply to this checkout, not an independently inspected physical assembly. C22's fitted part number was supplied by the user. The deployed firmware version is unknown. No circuitry or firmware was modified.

## Overall assessment

The architecture is sensible: an AD7124-8 with differential four-wire RTD sensing, a shared excitation source, analog channel selection, input filtering, and an RP2040 for communication and calibration. The buck supply and external ADC are appropriate building blocks. The implementation is still at prototype maturity: there are confirmed component and firmware defects, an analog headroom problem, and unqualified field interfaces. I would not replicate the existing design unchanged for the four additional units.

Priority definitions: P1 = resolve before field qualification/build replication; P2 = resolve or explicitly qualify before deployment. Findings distinguish direct file evidence from inferred physical behavior.

## 1. P1 — C22 is overvolted: confirmed

C22 pad 1 is +12V and pad 2 is GND in schematic, PCB and production netlist. The supplied assembly part CL05A106MQ5NUNC is rated 6.3 V. Replace it; a parallel 1000 µF capacitor does not reduce its DC voltage. Specify a qualified 25 V ceramic retaining adequate capacitance under bias and temperature, with a suitable footprint. Audit C1 and other rail capacitors against the real assembly order. This is a confirmed rating violation; actual damage and its contribution to startup have not been measured. [Samsung specification](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/41/CL05A106MQ5NUNC_Spec.pdf).

The 1000 µF workaround and three-unit Talon startup require requalification after this repair. See [power diagnosis](DIAGNOSIS.md). Preserve controlled inrush if substantial bulk capacitance remains necessary.

## 2. P1 — Excitation/reference network has insufficient margin at 500 µA

Verified current path: U8 AIN0/IOUT → U5 mux → RTD excitation lead → RTD → return diode D2–D8 → R19 5.11 kΩ → R20 250 Ω → GND. The firmware selects 500 µA at `sdi12-analog-mux.c:347`.

For a 100 Ω RTD, resistor drops alone total:

`0.0005 × (5110 + 250 + 100) = 2.73 V`.

At a nominal 3.3 V supply, the AD7124 specified current-source compliance ceiling is 2.93 V. Only **0.20 V** remains for the diode, mux, and both excitation leads. The documented 1N4148 diode replacement is very likely to exceed that allowance by itself at this current. Actual voltages need measurement; current can fall out of regulation, changing common-mode/reference conditions. A ratiometric architecture does not excuse violation of those limits.

Reducing current alone is not a complete fix: R20 lifts REFIN− only to 125 mV at 500 µA, 62.5 mV at 250 µA, and 12.5 mV at 50 µA. The code enables the reference buffers, whose lower limit is 100 mV above ground. At 50 µA, R19 develops only 0.2555 V differential reference, below the ADC's 0.5 V minimum. Thus the README's 50 µA operating description is not a valid setting for this buffered circuit as drawn.

Redesign the reference resistance, ground-lift resistance, excitation current and diode/mux topology together. Verify headroom at cold diode voltage, supply minimum, RTD maximum resistance, and longest lead resistance. Do not specify a replacement operating current without that calculation. [AD7124 datasheet, reference and current-source limits](https://www.analog.com/media/en/technical-documentation/data-sheets/ad7124-8.pdf).

## 3. P1 — Firmware turns processor temperature into RTD gain error: confirmed

`ad1724.c:309–354` treats the RP2040 temperature sensor as a fixed 0.706 V source, estimates AVDD from it, and stores `g_vref_correction`. At line 518, that factor multiplies measured RTD resistance. The sensor voltage depends on temperature and device variation, so this cannot independently measure AVDD. [RP2040 datasheet, section 4.9.5](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf).

Illustrative calculation at constant true supply: using the nominal sensor slope, a 10°C increase lowers its voltage from 0.706 V to 0.68879 V. The correction increases by `0.706/0.68879 = 1.025`. Applied to 100 Ω, that is about 2.5 Ω, approximately 6.5°C equivalent near 0°C. This is an illustration, not measured field error. Because the factor is calculated at startup, reboot temperature can change the calibration scale.

Remove or replace this correction after fixing the analog operating point and then recalibrate. If rail measurement is needed, use an actual known reference/supply-monitor method. Test precision resistors while changing board temperature separately from sensor temperature.

## 4. P1 — REFOUT is tied to the external reference sense node

Both the PCB and schematic join U8 pin 22 (REFOUT) to pin 12 (REFIN1+) on `POSITIVE_REF`, also connected through R29 to R19. This is not necessary for internally selected reference operation. `adc_read_internal_temperature()` enables the internal reference (`ad1724.c:595`), so diagnostic mode can drive a node intended to sense the external current-derived reference. The reference-measurement helper also enables it. Consequences depend on the active excitation and settling; this is a verified connection and mode interaction, not a measured contention current.

Separate REFOUT from the external reference sense network and retain its required local decoupling. Test RTD → internal-temperature → RTD transitions, including failures/timeouts. [AD7124 reference documentation](https://www.analog.com/media/en/technical-documentation/data-sheets/ad7124-8.pdf).

## 5. P1 — SDI-12 measurement acknowledgment is late: confirmed

`sdi12.c:315` calls the measurement callback before sending `atttn`. The RTD callback includes a 20 ms delay, three discarded conversions and eight averaged conversions (`sdi12-analog-mux.c:218` onward). The delay alone exceeds the permitted response-start time; sending `time_seconds = 0` after finishing does not fix this.

Send the acknowledgment promptly with an appropriate completion time, then measure asynchronously and return stored results when requested. Use a logic analyzer to validate break handling, initial response timing, line release, and data readiness. A tolerant bench logger does not establish compatibility with the Talon logger. [SDI-12 specification, section 4.4 and timing](https://www.sdi-12.org/current_specification/SDI-12%20Specification%201.4%20February%2020%202023.pdf).

## 6. P1 — TXS0102 is not a complete SDI-12 physical interface

U3 B1 directly connects to the field data terminal; OE is permanently tied high. The translator has internal pull-ups and edge accelerators. There is no explicit SDI-12 source-impedance or controlled-slew network in that connection, nor a defined receive/off-state resistance to ground. Putting the MCU GPIO in input mode does not disable U3's internal pull-ups. This is a design-level compatibility concern, independent of the missing power rail.

SDI-12 specifies 1–2 kΩ transmitter source resistance, 160–360 kΩ off resistance to ground, and limited slew rate. The current circuit does not deliberately implement those properties. Redesign around a controlled transmitter and receiver with defined idle/released states; qualify it using actual cable capacitance and powered/unpowered combinations. Do not base qualification on a generic UART speed rating. [TXS0102 datasheet](https://www.ti.com/lit/ds/symlink/txs0102.pdf), [SDI-12 electrical specification](https://www.sdi-12.org/current_specification/SDI-12%20Specification%201.4%20February%2020%202023.pdf).

## 7. P1 — Calibration tool and firmware disagree: confirmed

The firmware calibration callback explicitly uses **5030 Ω** (`sdi12-analog-mux.c:127`). The Python tool reads an existing NVM value and computes `new = old × actual/measured` (`calibrate.py:54,570`). That formula is incorrect when the firmware used 5030 rather than `old`; repeated calibration can alter gain even with identical hardware and reference resistors. Align the assumed scale and add a repeated-calibration check.

The tool also writes one averaged value to every channel (`calibrate.py:324`), whereas acquisition applies per-channel values. Save individually determined channel constants if channel correction is intended. The hardware R19 nominal is 5110 Ω, while firmware defaults are 5030 Ω; explain or eliminate that discrepancy instead of leaving conflicting nominal values.

Historical evidence: `calibration_report_007_20260306_144608.txt` shows approximately 99.8 Ω standards producing about 108 Ω, followed by an averaged effective reference of 4677.01 Ω. This is much larger than R19's stated 0.1% tolerance and cannot be attributed to that tolerance alone. The report may precede the current firmware, so it does not identify which current defect caused the historical error. Room-temperature gain correction cannot establish cold accuracy.

## 8. P2 — Internal ADC temperature conversion is incorrectly decoded

`ad1724.c:633–646` sign-extends the ADC result as two's complement. Bipolar output is offset binary; the documented temperature equation subtracts `0x800000` before division. Correct decoding and verify using a representative raw code. This affects diagnostic temperature, not directly the external RTD conversion. [AD7124 temperature equation](https://www.analog.com/media/en/technical-documentation/data-sheets/ad7124-8.pdf).

## 9. P2 — USB and field power are connected without explicit source arbitration

U2's USB-fed 3.3 V output and U6's buck output are directly joined. The schematic contains no explicit ORing or power mux. Their behavior with USB only, 12 V only, both supplies, and either supply removed must be qualified against actual fitted regulators, including reverse-current behavior. This is a verified shared connection, not proof of harmful current on every board.

Prefer explicit power selection/ORing or a documented exclusive-power service arrangement. USB-only operation also does not power U1's 5 V SDI-12 rail; do not assume USB debugging reproduces field behavior.

## 10. P2 — Outdoor connector protection is incomplete

J4 feeds the power converters directly and feeds U3 directly on data. No dedicated reverse-polarity protection, input fuse/current-limiting stage or connector TVS network is present in the Gorgon netlist. The RTD sense inputs have useful 1 kΩ/filter networks, but excitation leads connect to mux pins without a complete connector surge-protection scheme. The return-path diodes are not a substitute for a field transient-protection design.

Define expected miswiring/ESD/surge exposure, then add protection consistent with the ADC leakage budget and regulator voltage limits. The nominal 17 V buck input ceiling leaves little room above a 16 V SDI-12 supply for transients. Protection should be validated rather than merely adding a TVS whose clamping voltage exceeds the protected part's limit.

## Layout, manufacturing and maintainability

The schematic visually groups functional blocks well. The MCU has its core regulator capacitors, clock, flash, USB series resistors and debug interfaces. The buck has nearby input/output components and substantial local copper/vias; this review did not establish a broken buck connection. ADC filtering and the separate differential sense leads are useful foundations. Ratiometric sensing reduces sensitivity to excitation variation within valid operating conditions.

However, the production BOM leaves most exact part numbers blank, including capacitor voltage/bias characteristics, reference-resistor temperature coefficient, inductor saturation current, and some regulator identity. D2–D8 remain generic `D_Schottky` in the design despite the documented 1N4148 assembly rework. This is a repeatability problem: the built circuit is not completely specified by the CAD/BOM.

KiCad 10.0.6 DRC: **148 violations, zero unconnected items**. Thirty are ADC footprint clearances (0.1651 mm versus a 0.2 mm local rule); these need assessment against actual footprint/manufacturer capability, not an assumption of 30 shorts. Most other messages concern library mismatches/missing libraries and silkscreen constraints.

ERC: **157 messages: 28 errors and 129 warnings**. Many reflect imported unspecified pin types, unused pins and library configuration, but the check is not clean. Repair symbol electrical types and review every meaningful connectivity error before release. Counts are not counts of proven hardware failures. This review used exported schematic imagery, board/netlist cross-checks, the earlier regulator copper render, and these rule reports; it is not a completed EMI, thermal, enclosure ingress, or production qualification.

For the next revision, preserve a continuous return plane, keep switching current loops away from ADC/reference routing, specify reference-resistor drift, add accessible rail/reference test points, and retain reset/debug access. Verify analog noise and accuracy with USB disconnected and during logger radio activity. More digital filtering cannot remove systematic gain/reference errors.

## Recommended order for the four builds

1. Correct C22 and audit the complete assembled BOM. Qualify single-board startup, then three-unit startup from discharged capacitors.
2. Resolve excitation/reference headroom and REFOUT routing on one prototype. Measure AIN0, REFIN+/− and RTD input common-mode at operating extremes.
3. Correct the temperature-derived gain correction, calibration contract, and SDI-12 acknowledgment timing; validate repeated calibration and command sequences.
4. Qualify or revise the SDI-12 physical interface, power-source interaction and field protection.
5. Freeze one hardware/BOM/firmware/calibration combination. Validate all seven channels at multiple resistance/temperature points, with board temperature varied independently, intended cables, minimum supply and cold starts. Record an accuracy requirement first; a 24-bit ADC is not an accuracy specification.
6. Build the four copies only against that qualified combination. A staggered Talon startup may recover current units, but it cannot qualify temperature accuracy or correct C22's voltage rating.

## Local evidence

- [Power investigation](DIAGNOSIS.md)
- [Schematic image](gorgon-schematic.png)
- [Exported netlist](gorgon-review-netlist.xml)
- [DRC report](gorgon-drc.rpt)
- [ERC report](gorgon-erc.rpt)
- [Firmware ADC driver](../../../Project-Gorgon-Firmware/ad1724.c)
- [Main application](../../../Project-Gorgon-Firmware/sdi12-analog-mux.c)
- [SDI-12 implementation](../../../Project-Gorgon-Firmware/sdi12.c)
- [Calibration tool](../../../Project-Gorgon-Firmware/calibration/calibrate.py)

No bench tests or firmware execution on physical hardware were performed. Confirm deployed firmware and physical rework before attributing field symptoms to a particular source-code finding.
