# Lab handoff: Gorgon design and power review

Start with [DIAGNOSIS.md](DIAGNOSIS.md) for the three-board power failure and [DESIGN-REVIEW.md](DESIGN-REVIEW.md) for the broader review. These are an investigation and proposed tests, not completed repairs or a qualified design release. No physical measurements were performed by the reviewing agent.

## User-confirmed observations

- Three Gorgons connect to **separate sensor ports on one SDI-12 Talon**. With all three connected, none powers reliably and the Talon's 12 V sometimes fails to rise.
- Replacing the logger with GEMS_010 did not resolve SDI-12 read/detect/power-init failures and sensor-power warnings.
- A one-mux logger configuration briefly worked. Its exact power/data sequencing is not available here.
- Each Gorgon has an added **1000 µF input capacitor**. This was needed because the Gorgon's 3.3 V rail failed to start even on an **independent 12 V supply**. Do not assume the Talon caused that original failure.
- The user identified **CL05A106MQ5NUNC** as the assembled capacitor in the C22 discussion. It is rated 6.3 V; C22 is across +12 V and GND in the schematic, PCB and production netlist. Confirm the assembly designator and physical board revision before rework.
- The user reports the latest Talon revision. The supplied repository documents v1.4; physical markings have not been inspected.
- Four additional builds and outdoor installation before freeze in Thief River Falls are time-sensitive. A year-end deliverable is not the installation deadline.
- The changed antenna reportedly worsened cellular connectivity; no causal link to the power failure has been established.

## First lab session

1. Record physical revisions, all existing rework, fitted C22/C1 parts, deployed firmware/configuration, supply settings, and cable lengths. Photograph the regulator area if useful.
2. With power disconnected and capacitors discharged, confirm C22 continuity to J4 pin 1 (+12 V) and J4 pin 3 (GND). Replace the underrated part before further 12 V qualification; adding capacitance in parallel does not correct its voltage rating.
3. On a corrected board, compare startup with appropriate local ceramic bypassing and with the 1000 µF workaround. Capture U6 VIN and 3.3 V simultaneously, USB disconnected. A supply display is not a startup waveform.
4. Then capture Talon input 3.3 V, raw 12 V at C9, port output voltage and relevant faults during single, simultaneous-three and staged-three startup. The detailed report distinguishes the fault polarities and supply stages.
5. Validate the separate analog and firmware findings in the overall review. Do not assume every source-code finding describes the deployed binary, or that fixing power alone qualifies measurement accuracy.

For each trial, record board ID, firmware revision, exact wiring/rework, supply voltage/current limit, probe nodes, test action, captured waveform filenames, outcome and interpretation. Preserve raw measurements and distinguish observation from hypothesis. Add lab results to a new dated note alongside these reports so the original review remains traceable.

## Folder arrangement on the lab computer

Keep these repositories as siblings under any parent directory:

```text
gorgon/
  Project-Gorgon-Hardware/
    docs/design-review-2026-09-06/  <-- this handoff
  Project-Gorgon-Firmware/
  Talon-SDI12/
  Project-Kestrel/
  kistack/                       <-- optional local KiCad skills
```

Relative links in the reports follow that arrangement. Historical paths embedded in KiCad's generated reports/netlist describe the review machine; they need not exist on the lab computer. The exported PNG/SVG files are directly viewable. `render-detail.cjs` is an optional crop renderer and requires Node.js with `sharp` available; the PNG is already included.

## Source revisions reviewed

| Repository | HEAD at handoff preparation |
|---|---|
| Project-Gorgon-Hardware, before this documentation commit | `8b84860ecc22e27c8c2fa7a2cfa7f66302e375bf` |
| Project-Gorgon-Firmware | `efc0b9da459f3705718986a0e039e167b8b92fd8` |
| Talon-SDI12 | `10fa75d569e4cc0d9df58e523539647c02b93214` |
| Project-Kestrel | `4531bba269e10d33e8866283889c40a0a308d147` |

The reviewing tools used KiCad 10.0.6. DRC and ERC reports contain unresolved findings; no fabrication release was produced. Hardware repository user settings (`.kicad_prl`) were modified in the working directory and intentionally excluded from the documentation commit.
