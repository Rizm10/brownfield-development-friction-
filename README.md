# Brownfield Development Friction

An interactive opportunity-screening dashboard for brownfield land in the London Borough of Brent. It combines the national brownfield register with six planning and environmental datasets to show which active sites appear comparatively less constrained.

**[View the live dashboard](https://brownfield-development-friction.vercel.app/)**

**This is an opportunity-screening tool, not planning due diligence.**

## What the project does

The project asks:

> Which brownfield development opportunities appear least constrained by the planning designations available in the national Planning Data platform?

The React dashboard turns the analysis into an explorable decision-support tool. It provides:

- headline counts that respond to the current filters;
- filters for friction tier, planning status, ownership and minimum stated capacity;
- a Leaflet map of all matching entities, using a consistent Tier 0–3 colour scale;
- a sortable opportunity list, ordered by friction and capacity by default;
- synchronised list and map selection;
- a site detail panel with capacity, area, planning, ownership and constraint information;
- constraint chips and warnings for density records flagged by the quality check; and
- a reset control and clear empty-results state.

The analysis behind the dashboard is documented in [`brownfield.ipynb`](brownfield.ipynb). The frontend consumes the frozen 213-row export in [`src/data/brownfield_brent_results.json`](src/data/brownfield_brent_results.json).

## Study area and data source

Brent is used as the initial study area so the full spatial-screening workflow can be tested at borough scale. Records were retrieved from the UK Government [Planning Data](https://www.planning.data.gov.uk/) API by requesting `brownfield-land` entities within the boundary of Brent LPA (`entity 626205`).

The source extract contained **287 historical brownfield records**. Records with an `end-date` were treated as historical, leaving **213 current active entities**. All 213 active records had usable representative coordinates and were retained in the frontend dataset.

Each representative point was screened against these six Planning Data datasets:

1. conservation areas (`conservation-area`)
2. listed buildings (`listed-building`)
3. Article 4 direction areas (`article-4-direction-area`)
4. flood risk zones (`flood-risk-zone`)
5. green belt (`green-belt`)
6. tree preservation zones (`tree-preservation-zone`)

The analysis records a boolean match for each dataset and counts the non-Article-4 matches separately.

## Friction tiers

Article 4 direction areas can remove specified permitted-development rights. They cover a large share of the Brent records in this snapshot, so counting every designation equally would make Article 4 dominate the result. The model therefore separates sites where Article 4 is the only selected match from sites with other selected constraints.

| Tier | Screening definition | Entities | Share |
| --- | --- | ---: | ---: |
| **0 — Lower apparent friction** | No selected constraint detected | 51 | 23.9% |
| **1 — Article 4 only** | Article 4 detected; no other selected constraint detected | 131 | 61.5% |
| **2 — Additional constraint** | One non-Article-4 constraint detected, with or without Article 4 | 30 | 14.1% |
| **3 — Multiple additional constraints** | Two or more non-Article-4 constraints detected | 1 | 0.5% |

These tiers are comparative screening categories. They are not scores of planning difficulty, development viability or approval likelihood.

## Key findings

| Selected dataset | Matching entities | Share of 213 |
| --- | ---: | ---: |
| Article 4 direction area | 159 | 74.6% |
| Conservation area | 20 | 9.4% |
| Flood risk zone | 11 | 5.2% |
| Tree preservation zone | 1 | 0.5% |
| Listed building | 0 | 0.0% |
| Green belt | 0 | 0.0% |

Thirty-one entities have at least one selected non-Article-4 constraint: 30 are Tier 2 and one is Tier 3. A zero in this table means no match was returned for the entity's representative point in this data snapshot; it does not prove that the site is unconstrained.

## Methodology

1. Fetch all `brownfield-land` records spatially within Brent LPA from the Planning Data API.
2. Preserve the 287-record historical extract, then select records with no `end-date` as current.
3. Convert the 213 active representative WKT points to EPSG:4326 geometries.
4. Query the six selected constraint datasets at each representative coordinate.
5. Calculate selected-constraint counts, non-Article-4 counts and the four friction tiers.
6. Retain each unique Planning Data `entity`, even where cleaned brownfield references collide.
7. Convert area and dwelling-capacity fields to numeric values and run the density quality check.
8. Export the entity-level fields, screening results and QA flags for the React frontend.

The notebook contains the reproducible extraction, screening, QA and export steps. The JSON committed to the repository is the frozen dataset used by the application; the frontend does not alter the analysis logic.

## Data-quality checks and limitations

### Representative points, not site polygons

The brownfield source records provide representative points rather than full site boundaries. Constraint matching is therefore point-based. A site boundary may intersect a designation even when its representative point does not, so a missing match must not be interpreted as proof that no constraint exists.

### Selected datasets and source coverage

The tier reflects only the six datasets listed above. It does not include every consideration relevant to planning, land assembly, contamination, infrastructure, design, finance or delivery. Results also depend on the coverage and currency of the source datasets.

### Reference collisions

Normalising references revealed **five repeated brownfield references**: 213 active entities correspond to 208 cleaned reference values. Some colliding records have different addresses, areas or attributes, so deduplicating by reference could incorrectly merge distinct sites or extents. The final analysis keeps all **213 unique Planning Data entity IDs** and uses `entity` as the application key.

### Missing fields

The snapshot includes missing source values, including 26 planning-status values, 26 ownership-status values and 29 maximum-dwelling values. The interface exposes missing planning and ownership values as filterable “Not recorded” categories and does not treat missing capacity as zero when applying a positive capacity threshold.

### Density QA

Implied density is calculated as:

```text
maximum net dwellings / hectares
```

The notebook applies the standard upper IQR rule (`Q3 + 1.5 × IQR`). In this snapshot the threshold is approximately **434.6 dwellings per hectare**, flagging **13 entities**. Flagged entities remain in the dataset because the purpose is to surface records for review, not silently discard them. Extreme values may reflect inconsistent areas, capacities or site extents rather than exceptional development efficiency.

## Run locally

### Prerequisites

- Node.js and npm

### Install and start

```bash
git clone https://github.com/Rizm10/brownfield-development-friction-.git
cd brownfield-development-friction-
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

### Quality checks and production build

```bash
npm run check
npm run preview
```

`npm run check` runs linting, validates the frozen dataset and creates the production bundle in `dist/`. `npm run preview` serves that bundle locally for a final check.

## Technology

- React 19
- Vite 8
- React Leaflet and Leaflet
- OpenStreetMap tiles
- Python, pandas, GeoPandas and Shapely for the analysis workflow
- UK Government Planning Data API

## Repository structure

```text
.
├── brownfield.ipynb                         # extraction, spatial screening and QA
├── src/
│   ├── App.jsx                              # dashboard, filters, ranking and selection
│   ├── App.css                              # dashboard and responsive styling
│   └── data/
│       └── brownfield_brent_results.json    # frozen 213-entity frontend dataset
├── scripts/
│   └── validate-data.mjs                    # frozen-data integrity checks
└── package.json                             # application scripts and dependencies
```

## Responsible interpretation

Use the dashboard to compare records and decide where deeper investigation may be worthwhile. Before making a planning, acquisition or investment decision, verify the current source record, inspect full site boundaries, review the underlying designations and seek appropriate professional advice.
