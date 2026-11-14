# Martian Mars

### Mars exploration planning with traceable terrain and image evidence

An independent project for **NASA Space Apps Challenge: Interplanetary Survival Guide - Martian Map**.

Martian Mars aims to help explorers compare candidate routes, inspect their surroundings through real orbital observations, and understand what the available data can and cannot support.

**Status: planning and rebuild stage.** This repository currently contains the project documentation. Features below describe the intended implementation, not completed or validated capabilities.

## The challenge

Future Mars explorers need more than a route drawn on a map. They need to understand terrain, investigate scientifically interesting locations, and evaluate the evidence behind a proposed crossing.

This project addresses the challenge by combining Martian imagery, elevation, derived terrain measurements, and route inspection in one workspace. The central question is:

> What evidence supports this route, and what still requires a closer survey?

## Intended exploration workflow

1. **Choose a region.** Browse a Martian location and check the available imagery and elevation coverage.
2. **Set a departure and destination.** Identify the exploration objective and the area to investigate.
3. **Compare candidate routes.** Examine distance and terrain trade-offs under a clearly stated planning policy.
4. **Inspect checkpoints.** Review orbital imagery, elevation, derived slope, source records, and uncertainties at selected locations.
5. **Explore in 3D.** View the same terrain grid and route from different angles, with any vertical exaggeration explicitly labeled.
6. **Record and export.** Preserve route coordinates, inspection notes, source references, and model assumptions for review.

## Planned capabilities

| Capability | Intended behavior | Status |
| --- | --- | --- |
| Layered 2D Mars map | Display imagery, elevation context, coverage, and derived terrain layers | Planned |
| Regional selection | Support broader reconnaissance and identify where detailed local planning is possible | Planned |
| Route comparison | Compare distance-focused and terrain-aware candidates using A* | Planned |
| Checkpoint evidence | Connect selected coordinates to relevant imagery and terrain measurements | Planned |
| Three.js terrain view | Display the active elevation grid, routes, and inspection checkpoints | Planned |
| Source transparency | Show product identifiers, spatial resolution, acquisition information where available, and processing history | Planned |
| Route export | Export coordinates, assumptions, provenance, and inspection reasoning | Planned |
| Evaluation | Test routing correctness, coverage handling, and sensitivity to planning choices | Planned |

Initial study areas will be selected according to data availability. Jezero is a candidate for detailed inspection; Gale and Olympus Mons are candidates for broader regional demonstrations. Coverage will be shown explicitly rather than implying equal detail across Mars.

## Scientific data sources

The implementation will document the exact products it uses. The following are intended source families, not a claim that they have already been ingested.

| Source | Intended use | Important distinction |
| --- | --- | --- |
| NASA Mars Global Surveyor / MOLA | Regional elevation and topographic context | Kilometer-scale products cannot resolve local walking hazards; some bins are interpolated |
| NASA Mars Reconnaissance Orbiter / CTX | Orbital imagery and selected stereo elevation products | An image mosaic and an elevation model are different products with different resolutions |
| NASA MRO / HiRISE | Detailed visual evidence where suitable observations exist | Coverage is localized; capture dates and footprints must be checked |
| NASA Perseverance or Curiosity imagery | Surface context near documented rover observations | A rover photograph must not be presented as a view from an arbitrary checkpoint |
| Caltech Murray Lab Global CTX Mosaic | Broader orbital visual context | A multi-orbit mosaic has no single capture date; web previews may be much coarser than the source |

Source references:

- [NASA Planetary Data System](https://pds.nasa.gov/)
- [MOLA MEGDR documentation](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html)
- [USGS Jezero CTX elevation release](https://doi.org/10.5066/P906QQT8)
- [USGS Jezero CTX imagery release](https://doi.org/10.5066/P9GV1ND3)
- [HiRISE observation archive](https://www.uahirise.org/)
- [Caltech Murray Lab Global CTX Mosaic](https://murray-lab.caltech.edu/CTX/V01/TilePages/)
- [Global CTX Mosaic PDS archive](https://doi.org/10.17189/m23v-ae12)

## Scientific boundaries

The project will distinguish **observed data**, **derived measurements**, **model assumptions**, and **unavailable evidence**.

- A candidate route is a result of its chosen dataset, footprint, constraints, and cost function. It is not a NASA-certified safe route.
- Detailed imagery does not increase the resolution of a coarse elevation model.
- Slope thresholds and route weights are prototype planning choices. Their effects should be evaluated rather than treated as universal astronaut limits.
- A terrain-cost index is not measured energy expenditure or a probability of injury.
- Travel-time and consumable estimates, if implemented, must state their assumptions and validation limits. Unsupported estimates will be omitted.
- Terrain-derived science candidates are investigation hypotheses, not confirmed mineral or resource detections.
- 3D shading and vertical exaggeration are visualization aids. They do not add measured terrain detail.
- Missing data will remain identifiable; unrelated images or invented observations will not substitute for evidence.

## Planned technical approach

- **Interface:** HTML, CSS, and JavaScript.
- **2D mapping:** Leaflet with documented Mars coordinate handling.
- **3D visualization:** Three.js using the active elevation grid.
- **Data preparation:** Python with geospatial and numerical tools such as Rasterio, NumPy, and SciPy.
- **Routing:** A* over a bounded terrain grid, with explicit handling of unknown and excluded cells.
- **Reproducibility:** Data preparation scripts, product manifests, source links, and checksums.
- **Testing:** Analytical terrain cases, routing comparisons, geographic boundary cases, and browser workflows.

Technology and implementation details may change during development. Setup commands will describe the code actually present in this repository.

## Development roadmap

- [ ] Establish the project structure and choose an initial data footprint.
- [ ] Prepare real elevation and imagery products with provenance records.
- [ ] Implement the 2D exploration interface and endpoint selection.
- [ ] Implement and test route comparison.
- [ ] Add checkpoint evidence and inspection notes.
- [ ] Add the synchronized 3D terrain and route view.
- [ ] Evaluate policy sensitivity and demonstrate difficult or unavailable routes.
- [ ] Prepare a complete mission demonstration, including return travel if implemented.
- [ ] Add screenshots, a demonstration video, installation instructions, and validation results.
- [ ] Complete team contributions, source credits, project licensing, and third-party notices.

## Getting started

```bash
git clone https://github.com/CYPHER8848/NASA-Martian-Mars.git
cd NASA-Martian-Mars
```

There is no runnable application in this repository yet. Application startup, dependencies, data preparation, and test commands will be added alongside the implementation.

## Development history and transparency

An earlier prototype was explored before this repository was created. This repository is intended to track the new implementation and its development history.

Any permitted reuse of prior code, prepared data, assets, or external components will be identified and credited. Work completed during the event will be distinguished from earlier research and prototyping. Creating a new repository or rewriting an existing prototype does not, by itself, establish compliance with event rules; the team will follow the applicable rules and organizer guidance.

Tool and AI assistance used in development will be documented along with the team's contributions. The README will be updated to describe verified functionality as it is built.

## Credits and licensing

NASA, JPL, USGS, the relevant instrument teams, Caltech Murray Lab, and other providers will be credited for the specific products used. External libraries and datasets retain their respective terms and notices. Project licensing and third-party documentation will be added with the implementation.

**Martian Mars is an independent hackathon project. It is not an official NASA application and is not validated for operational EVA planning.**
