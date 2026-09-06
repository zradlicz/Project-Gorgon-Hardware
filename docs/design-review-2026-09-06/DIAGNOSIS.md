# Three-Gorgon / SDI-12 Talon power investigation

2026-09-06. Scope: local Gorgon schematic and PCB, Gorgon firmware, Talon SDI-12 Eagle schematic and board / v1.4 production BOM, and Kestrel Eagle schematic and board / v1.9 BOM. User confirms separate Talon sensor ports, a 1000 µF capacitor on each Gorgon, and latest Talon revision. The latest Talon revision in these files is v1.4; verify physical markings before rework.

## Finding

**Confirmed component-selection defect, based on the supplied C22 assembly part:** Samsung **CL05A106MQ5NUNC is 10 µF, 6.3 V, ±20%, X5R, 0402**. C22 is connected across 12 V, about 1.9 times its rated voltage. It is unsuitable at this location and must be replaced before further 12 V qualification. The 1000 µF parallel rework does not reduce its applied DC voltage. This establishes an overvoltage condition, not proof of the exact physical failure mechanism or that it alone explains every symptom. Source: [Samsung specification sheet](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/41/CL05A106MQ5NUNC_Spec.pdf).

**Updated evidence:** The user confirms that, before the 1000 µF rework, Gorgon's 3.3 V failed to start even from an independent 12 V supply. The Talon therefore cannot explain that original failure. Treat the investigation as two potentially interacting problems: Gorgon input/regulator startup, followed by shared Talon startup with the added capacitors. A bench supply does not establish that voltage was stable at U6 during startup; lead impedance and supply current limiting remain possible.

**The leading explanation is a startup power/protection interaction: three 1000 µF input capacitors and three boards load a single shared boost converter.** Separate sensor ports do not provide independent 12 V supplies. Either the shared supply collapses, its upstream switch trips, or individual port protection latches off. A wrong Kestrel supply-mode sequence can exacerbate this dramatically.

The design and reported symptoms support this diagnosis, but there is no oscilloscope trace or field firmware/configuration here to identify the first component that trips. Do not treat a particular failed component as proven. A bad cable or one excessive-load board can also trigger the common supply failure.

## Verified circuit evidence

| Stage | Actual circuit in the local files | Implication |
|---|---|---|
| Kestrel main Talon supply | U15 MIC22602 supplies `3V3_BULK+`; U30 TCK111G passes it to `3V3_TALON+` when `3V3_AUX_EN` is high | Main supply must be active for the sensor load |
| Kestrel standby Talon supply | U31 FPF2195BUCX feeds the same rail from `3V3_CORE`; U32 inverts `3V3_AUX_EN`; R68 is 5.6 kΩ | Standby is approximately 100 mA at 3.3 V. This is a separate, much smaller budget |
| Kestrel daughterboard protection | Each Talon connector has AP2411 (`P1:U4` through `P4:U4`) before its 3.3 V output | One switch feeds the entire SDI-12 Talon, including all its sensor ports; a trip removes power from all of them |
| Talon shared boost | U8 is populated as LM2623AMM/NOPB, despite the LM2621 library symbol; L1 6.8 µH, D2 CDBA3100, C9 100 µF; R24 115 kΩ and R25 13.3 kΩ set about 11.96 V | One 3.3 V-to-12 V converter serves Q5–Q8, not one converter per connector |
| Talon sensor port protection | Q5/Q6/Q7 feed R5/R6/R7 (82 mΩ), then J3/J4/J5. U4 INA4180A2 gain 50, U5 MAX9034, D1 2.048 V reference, U2 CD4044 latch | Nominal per-port trip is 2.048 / (50 × 0.082) = **0.4995 A**. This is a latching cutoff, not a controlled capacitor-charging current source |
| Talon transient filtering | C17–C20 are DNP; R35–R38 are 1 kΩ | No populated capacitor provides an intentional RC delay at those comparator inputs; a sufficiently long charging transient can latch a port off |
| Gorgon input | J4 pin 1 = +12 V, pin 2 = data, pin 3 = GND. C1 1 µF and C22 10 µF are directly across input. Added 1000 µF capacitors are documented rework | The three field capacitors total 3000 µF, plus on-board capacitance |
| Gorgon regulators | U6 `XPS629210DRLR` has VIN and EN tied to +12 V and supplies +3V3; U1 makes +5 V for the translator. U2 supplies +3V3 from USB VBUS | MCU load starts as input rises. USB can mask the field power failure; baseline testing should have USB disconnected |

These power connections were checked against the Gorgon PCB pad nets and Talon Eagle board signals, not just README descriptions. The Gorgon schematic was exported with KiCad and visually inspected. This is a targeted power review, not a complete ERC/DRC or production release.

## Why the capacitors matter

For the three added capacitors, C = 0.003 F. Charging them to 12 V requires Q = CV = **0.036 coulomb** and stored energy E = ½CV² = **0.216 J**, before running the boards.

Illustrative linear ramps, not measured waveforms:

| Time to reach 12 V | Charging current per Gorgon | Combined 12 V charging current |
|---|---:|---:|
| 10 ms | 1.2 A | 3.6 A |
| 100 ms | 0.12 A | 0.36 A |

At 85% assumed boost efficiency, 0.36 A at 12 V requires about **1.54 A at 3.3 V near the end of the ramp**, before board operating current and other Talon loads. For a single 1000 µF capacitor, charging under 0.5 A needs at least 24 ms even with zero operating load. The existing port switches do not enforce such a ramp.

The AP2411 is rated for 2 A continuous load with a typical 2.5 A current limit and approximately 7 ms fault blanking/latch time; actual thresholds and timing vary. The LM2623 switch-current rating is an inductor/switch peak rating, not available 12 V output current. Thus comparing three Gorgon currents directly with the boost's advertised ampere figure is invalid. See [AP2411 datasheet](https://www.diodes.com/datasheet/download/AP2411.pdf) and [LM2623 datasheet](https://www.ti.com/lit/ds/symlink/lm2623.pdf).

The standby branch deserves explicit verification: [FPF2195 datasheet](https://www.onsemi.com/download/data-sheet/pdf/fpf2194-d.pdf) gives about 100 mA with 5.516 kΩ, close to the installed 5.6 kΩ. Even an ideal 3.3 V, 100 mA source only represents 27.5 mA at 12 V; conversion losses and other loads reduce that. This is not adequate evidence of main-power capacity simply because a meter initially reads 3.3 V.

The hardware README's extra capacitor can help local transient stability after startup while worsening the initial load seen by the Talon. Removing all input capacitance is not a qualified fix. The firmware README's 130 mA statement is not a measurement of these installed units or the Talon's actual hardware trip threshold.

## Decisive bench test

### First resolve the independent-supply startup failure

The repository BOM specifies **C22 = 10 µF, 0402**, with no manufacturer part number, voltage rating or dielectric. The user subsequently supplied **CL05A106MQ5NUNC** as the assembled capacitor. Its 6.3 V rating is insufficient for C22's 12 V connection. Remove that part and replace it with a qualified higher-voltage ceramic; do not leave it in parallel with the replacement. Treat previously overstressed capacitors as suspect even if a low-voltage capacitance check looks normal. Actual breakdown, leakage or loss of capacitance has not been measured, and the 1000 µF rework's success does not establish which mechanism caused the original startup failure.

For the four additional builds, specify an exact manufacturer part number, voltage rating, dielectric and effective capacitance requirement for C22. A 25 V X7R/X5R ceramic selected to retain at least 3 µF at 12 V over tolerance/temperature is the target; use a larger footprint if required. Audit other capacitors on the 12 V rail, including C1, against the assembly order. Do not infer that use of this same 6.3 V part on a lower-voltage rail is automatically wrong. After correcting C22, test one board without the 1000 µF workaround under controlled conditions; then reassess whether all three boards still need bulk capacitance and whether the Talon startup problem remains.

The TPS629210 datasheet specifies at least 3 µF effective input capacitance, recommends 4.7 µF nominal in most applications, and requires a close VIN-to-GND connection. Its capacitor examples include 25 V parts. The PCB places C22 about 1.6 mm above U6 VIN, with local copper and a ground-via array; this inspection did not establish an open connection or an obvious pin-assignment error. R8 = 154 kΩ and R7 = 34 kΩ set approximately 3.318 V. R12 = 9.31 kΩ selects 2.5 MHz forced PWM with external feedback; that is a valid configuration. Source: [TPS629210 datasheet, sections 7.3, 8.3 and 9.2.2.3.3](https://www.ti.com/lit/ds/symlink/tps629210.pdf).

On one controlled bench unit, compare startup without the added electrolytic against startup with verified local ceramic decoupling selected to retain at least 3 µF at 12 V across tolerances and temperature. Use a suitably rated part (25 V is a reasonable starting rating, subject to its bias curve) and short connections at U6; long flying leads do not test local high-frequency bypassing. Retain the existing field rework until this replacement is validated.

Capture U6 VIN pin 6 relative to its GND pin 5, and +3V3 at C11 simultaneously, using short probe ground connections. USB should be disconnected. Record bench-supply current limit and test both supply-enable startup and application of already-live 12 V using short leads. VIN dips/restarts indicate input/source interaction; a clean VIN with failed VOUT moves the investigation to U6, feedback, output capacitance, load and assembly. Ringing can be damped by electrolytic ESR as well as capacitance, so success with 1000 µF does not prove that this much stored energy is required.

### Then identify the Talon failure stage

Use the installed cables, USB disconnected, and capture startup on a scope. Discharge capacitors through a suitable resistor between trials and verify discharged voltage; do not directly short them. If available, capture current with a current probe or properly installed shunt.

1. With sensor outputs off, enable Kestrel `3V3_AUX_EN` and verify `3V3_AUX_PG`, the main 3.3 V rail, and Talon input. Verify Talon C9 reaches approximately 12 V with no sensor outputs enabled.
2. Enable Talon `SENSE_EN`, allow its 3.3 V sense supply and 2.048 V reference to settle, and hold all `EN1–EN4` low to reset their latches. Then enable one port. Repeat separately for each Gorgon and each suspect cable/port combination.
3. Start all three from discharged inputs using the current firmware. Compare that capture with a staged startup: enable one, wait for voltage and current to settle, then the second, then the third. An initial 0.5–1 s diagnostic spacing is reasonable; determine production timing from measured settling, not this trial value.
4. Keep all three on and perform measurements. If staged startup works but operation later collapses, investigate sustained demand and supply mode changes as well as inrush. If a particular board/cable causes failure regardless of position, isolate that load first.

| Probe/readout | Result | Interpretation |
|---|---|---|
| Talon J2 pin 2 / C3 positive to GND, plus Kestrel `!TALONx_FAULT` | 3.3 V disappears and upstream fault asserts low while upstream input stays sound | AP2411/common feed shutdown |
| Kestrel `3V3_AUX_EN`, `3V3_AUX_PG`, `3V3_TALON+` | Main supply never enabled or falls back to standby | Supply mode/firmware ordering or main supply fault |
| Talon C9 positive (raw 12 V), compared with 3.3 V input | 3.3 V holds but C9 voltage collapses | Shared boost overload/startup limitation, or a downstream excessive load |
| C9 holds near 12 V; J3/J4/J5 pin 1 fails and corresponding Talon `FAULT1/2/3` is high | Port shutdown | Per-port overcurrent latch; check inrush, wiring, and unit load |
| C9 and all port rails hold | Gorgon local +3V3 or communications fail | Continue at U6 output and then protocol/boot checks |

Talon `FAULT1–4` are active high; Kestrel `!TALONx_FAULT` is active low. Read faults while their logic supplies are valid. The sensor-port voltage ADC measures the switched output, so its result alone cannot distinguish a stopped boost from an open port switch. Scope C9 as well. Talon J2's pin numbering above is the PCB netlist numbering; confirm connector orientation before probing.

## Corrective direction

First test and enforce this logger sequence: **main Kestrel supply on and settled → Talon supply on → sensing on and settled → reset port latches → start ports one at a time → enable only the data path being polled.** Keep the main supply on whenever these sensors require it. A Talon port fault needs an EN low/reset followed by a controlled retry; a Kestrel AP2411 latch needs its own Talon enable reset. Capture faults before a retry and bound retries.

The supplied Talon demo explicitly states that `SENSE_EN` must precede port enables at `TalonSDI12SerialDemo.ino:364`, but the demo uses MCP23018 while the v1.4 board uses PCAL9535A. It is evidence of intended ordering, not a production-ready patch. The actual deployed logger firmware, GEMS_010 configuration and error logs are absent from these folders; changing Gorgon's MCU firmware cannot directly control the Talon's power switches.

If staged startup still trips individual ports, retain needed bulk capacitance behind a **controlled precharge/inrush-limiting circuit**, dimensioned from measured running current and capacitor charge demand. If all three exceed sustained capacity, provide a suitably rated regulated sensor supply. When using an external 12 V supply, disconnect Talon +12 V from the sensor feeds, retain common GND and the correct data connections, and provide branch protection. Do not parallel the external supply with the Talon boost output or simply increase/bypass the fault limits.

## Four additional builds

Qualify the supply/startup solution on the existing three before replicating the power arrangement. The field-ready acceptance test should include repeated fully discharged starts with three attached boards, the longest actual cable, low intended battery condition, cold operation at the intended deployment temperature, all 21 RTD readings, and logger wake/sleep and cellular transmission cycles. Start with 20 consecutive discharged-start trials per critical condition and a sustained logging run; this is an initial engineering acceptance target, not a demonstrated reliability rating.

For each new board: verify diode rework documented in the hardware README, input capacitor polarity/rating, 12 V/5 V/3.3 V rails, measured startup and running current, all seven channels, serial identity, calibration, and enclosure/cable sealing. Record the tested board revision and power solution. Plan installation ahead of local freeze based on the actual field schedule; the end-of-year deliverable is not the installation deadline.

## Independent communication issue

The supplied Gorgon application hard-codes address `0` (`sdi12-analog-mux.c:379`), and `sdi12.c:369` does not implement address change. If multiple data paths are enabled together, identical addresses can collide. Separate Talon ports can use the same address if firmware connects/polls only one data path at a time. The installation document's instruction to assign addresses via NVM is not implemented in this checkout. This explains possible read/detect failures after power is healthy, but not a missing 12 V rail.

The changed antenna is not established as the cause. Repeat rail captures during cellular transmission to see whether radio current worsens shared-supply margin; investigate RF performance separately once power is reliable.

## Evidence artifacts

- [Gorgon exported netlist](gorgon-review-netlist.xml)
- [Gorgon schematic image](gorgon-schematic.png)
- [Gorgon schematic SVG](sdi12-analog-mux.svg)
- [Hardware capacitor erratum](../../README.md)
- [Talon schematic](../../../Talon-SDI12/Hardware/Talon_SDI12.sch)
- [Kestrel schematic](../../../Project-Kestrel/Hardware/MainLogger.sch)
- [INA4180 gain specifications](https://www.ti.com/lit/ds/symlink/ina4180.pdf)
- [CD4044 latch specifications](https://www.ti.com/lit/ds/symlink/cd4044b.pdf)

No design files or firmware were modified, and no physical bench tests were performed in this investigation.

Follow-up layout check: KiCad reported 148 DRC violations and zero unconnected items in the current PCB. These findings do not diagnose an analog startup problem or validate the assembly. They need separate disposition before a new fabrication release. See `gorgon-drc.rpt`; `regulator-detail.png` shows the reviewed copper area. No fabrication outputs were released.
