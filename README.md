# SDI-12 Underground Temperature Sensor

A 7-channel 4-wire RTD temperature measurement device that communicates via the SDI-12 protocol, designed for underground temperature profiling applications.

## Overview

This device is an SDI-12 sensor that provides high-precision temperature measurements from seven 4-wire RTD (Resistance Temperature Detector) inputs. It is designed for underground temperature sensing applications such as soil temperature profiling, permafrost monitoring, and geothermal studies. The 4-wire RTD configuration eliminates lead resistance errors, enabling accurate measurements even with long cable runs to buried sensors.

Built around the Raspberry Pi RP2040 microcontroller and featuring a 24-bit ADC, the sensor integrates seamlessly with existing SDI-12 data logger infrastructure.

## Features

- **7 channels** of 4-wire RTD temperature measurement
- **24-bit precision ADC** (AD7124-8) for high-resolution measurements
- **8-channel analog multiplexer** (ADG708) for RTD channel selection
- **SDI-12 protocol** compatible with standard environmental data loggers
- **RP2040 microcontroller** (dual-core Arm Cortex-M0+)
- **USB interface** for configuration and direct data access
- **128Mb flash memory** for configuration storage
- **Weatherproof enclosure** with gasket seal for field deployment

## Hardware Specifications

| Parameter | Value |
|-----------|-------|
| RTD Channels | 7 (4-wire configuration) |
| ADC Resolution | 24-bit |
| Communication | SDI-12, USB |
| Power Supply | 5V |
| Logic Level | 3.3V (internal) |
| MCU | RP2040 (Raspberry Pi) |

## Key Components

| Reference | Part | Description |
|-----------|------|-------------|
| U7 | RP2040 | Main microcontroller |
| U8 | AD7124-8BCPZ | 24-bit 8-channel ADC |
| U5 | ADG708BRUZ | 8-channel analog multiplexer |
| U4 | W25Q128JVS | 128Mb SPI flash memory |
| U3 | TXS0102DCT | Bidirectional level shifter |
| U2 | NCP1117-3.3 | 3.3V voltage regulator |
| U1 | LP2950-5.0 | 5V voltage regulator |

## Repository Structure

```
├── sdi12-analog-mux.kicad_sch    # KiCad schematic
├── sdi12-analog-mux.kicad_pcb    # KiCad PCB layout
├── sdi12-analog-mux.kicad_pro    # KiCad project file
├── sdi12-analog-mux.step         # 3D model of assembled PCB
├── CAD/
│   ├── assembly.FCStd            # FreeCAD full assembly
│   ├── bottom_housing.FCStd      # Bottom enclosure design
│   ├── PCB.FCStd                 # PCB model
│   └── enclosure/
│       ├── Bottom.stl            # 3D printable bottom housing
│       ├── Cover.stl             # 3D printable top cover
│       ├── Gasket.stl            # 3D printable gasket
│       ├── Gasket_Drawing.dxf    # Gasket cutting template
│       └── *.step                # STEP files for CAD import
└── production/
    ├── bom.csv                   # Bill of materials
    ├── positions.csv             # Component placement data
    ├── designators.csv           # Component designators
    └── netlist.ipc               # IPC netlist
```

## Applications

- Soil temperature profiling
- Permafrost and active layer monitoring
- Geothermal gradient measurement
- Agricultural soil monitoring
- Infrastructure temperature monitoring (roads, pipelines)
- Environmental research

## Manufacturing

Production files are located in the `production/` directory:
- **BOM**: `bom.csv` contains the complete bill of materials
- **Pick and Place**: `positions.csv` provides component placement coordinates
- **Gerbers**: Included in `sdi12-analog-mux.zip`

## Enclosure

The enclosure is designed for 3D printing and field deployment:
- Bottom housing with mounting features
- Top cover
- Gasket for weatherproof sealing
- Provisions for cable glands and ventilation

STL files for printing and STEP files for CAD integration are provided in `CAD/enclosure/`.

## Design Tools

- **PCB Design**: KiCad 8
- **Mechanical Design**: FreeCAD

## License

This project is open-source hardware.
