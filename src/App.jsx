import { useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import brownfieldSites from "./data/brownfield_brent_results.json";
import "./App.css";

const tierColors = {
  0: "#16a34a",
  1: "#2563eb",
  2: "#f59e0b",
  3: "#dc2626",
};

const tierDefinitions = {
  0: "No selected constraints detected",
  1: "Article 4 only",
  2: "One additional non-Article 4 constraint",
  3: "Two or more non-Article 4 constraints",
};

const constraintFields = [
  ["article-4-direction-area", "Article 4 direction area"],
  ["conservation-area", "Conservation area"],
  ["flood-risk-zone", "Flood-risk zone"],
  ["tree-preservation-zone", "Tree-preservation zone"],
  ["listed-building", "Listed building"],
  ["green-belt", "Green belt"],
];

const numberFormatter = new Intl.NumberFormat("en-GB");

function numberOrFallback(value, options = {}) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return "Not recorded";
  return new Intl.NumberFormat("en-GB", options).format(number);
}

function displayStatus(value) {
  if (!value) return "Not recorded";
  const label = value.replaceAll("-", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") return -Infinity;
  const number = Number(value);
  return Number.isFinite(number) ? number : -Infinity;
}

function valueWithUnit(value, unit, options = {}) {
  const formatted = numberOrFallback(value, options);
  return formatted === "Not recorded" ? formatted : `${formatted} ${unit}`;
}

function dwellingRange(minimum, maximum) {
  const minimumLabel = numberOrFallback(minimum);
  const maximumLabel = numberOrFallback(maximum);

  if (minimumLabel === "Not recorded" && maximumLabel === "Not recorded") {
    return "Not recorded";
  }
  if (minimumLabel === "Not recorded") return `Up to ${maximumLabel}`;
  if (maximumLabel === "Not recorded") return `From ${minimumLabel}`;
  if (minimumLabel === maximumLabel) return maximumLabel;
  return `${minimumLabel}–${maximumLabel}`;
}

function getDetectedConstraints(site) {
  return constraintFields
    .filter(([field]) => Boolean(site[field]))
    .map(([, label]) => label);
}

function App() {
  const [tierFilter, setTierFilter] = useState("all");
  const [planningFilter, setPlanningFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [minimumCapacity, setMinimumCapacity] = useState(0);
  const [sortMode, setSortMode] = useState("opportunity");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const mapRef = useRef(null);

  const filteredSites = useMemo(() => {
    return brownfieldSites.filter((site) => {
      const planningStatus = site["planning-permission-status"];
      const ownershipStatus = site["ownership-status"];
      const capacity = site["maximum-net-dwellings"];

      const matchesTier =
        tierFilter === "all" || String(site.friction_tier) === tierFilter;

      const matchesPlanning =
        planningFilter === "all" ||
        (planningFilter === "missing"
          ? !planningStatus
          : planningStatus === planningFilter);

      const matchesOwnership =
        ownershipFilter === "all" ||
        (ownershipFilter === "missing"
          ? !ownershipStatus
          : ownershipStatus === ownershipFilter);

      const matchesCapacity =
        minimumCapacity === 0 ||
        (capacity !== null &&
          capacity !== undefined &&
          capacity !== "" &&
          Number(capacity) >= minimumCapacity);

      return (
        matchesTier &&
        matchesPlanning &&
        matchesOwnership &&
        matchesCapacity
      );
    });
  }, [tierFilter, planningFilter, ownershipFilter, minimumCapacity]);

  const sortedSites = useMemo(() => {
    return [...filteredSites].sort((a, b) => {
      if (sortMode === "capacity") {
        return (
          numericValue(b["maximum-net-dwellings"]) -
          numericValue(a["maximum-net-dwellings"])
        );
      }

      if (sortMode === "hectares") {
        return numericValue(b.hectares) - numericValue(a.hectares);
      }

      if (sortMode === "density") {
        return (
          numericValue(b.dwellings_per_hectare) -
          numericValue(a.dwellings_per_hectare)
        );
      }

      if (sortMode === "address") {
        return (a["site-address"] ?? "").localeCompare(
          b["site-address"] ?? "",
        );
      }

      return (
        a.friction_tier - b.friction_tier ||
        numericValue(b["maximum-net-dwellings"]) -
          numericValue(a["maximum-net-dwellings"]) ||
        a.entity - b.entity
      );
    });
  }, [filteredSites, sortMode]);

  const tierCounts = useMemo(() => {
    return filteredSites.reduce(
      (counts, site) => {
        counts[site.friction_tier] += 1;
        return counts;
      },
      { 0: 0, 1: 0, 2: 0, 3: 0 },
    );
  }, [filteredSites]);

  const selectedSite =
    filteredSites.find((site) => site.entity === selectedEntity) ?? null;

  const hasActiveFilters =
    tierFilter !== "all" ||
    planningFilter !== "all" ||
    ownershipFilter !== "all" ||
    minimumCapacity > 0;

  function resetFilters() {
    setTierFilter("all");
    setPlanningFilter("all");
    setOwnershipFilter("all");
    setMinimumCapacity(0);
    setSelectedEntity(null);
  }

  function selectSite(site, moveMap = true) {
    setSelectedEntity(site.entity);

    if (moveMap && mapRef.current) {
      mapRef.current.flyTo([site.latitude, site.longitude], 15, {
        duration: 0.6,
      });
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <p className="eyebrow">Planning opportunity screen</p>
            <h1>Brownfield Development Friction</h1>
            <p className="subtitle">
              Explore 213 active brownfield entities across Brent by planning
              friction and development capacity.
            </p>
          </div>
          <span className="scope-badge">Brent · London</span>
        </div>
      </header>

      <section className="metrics" aria-label="Filtered site summary">
        <article className="metric-card">
          <span>Matching entities</span>
          <strong>{numberFormatter.format(filteredSites.length)}</strong>
          <small>of {brownfieldSites.length} active entities</small>
        </article>

        <article className="metric-card">
          <span>Lower friction</span>
          <strong>{numberFormatter.format(tierCounts[0])}</strong>
          <small>Tier 0</small>
        </article>

        <article className="metric-card">
          <span>Article 4 only</span>
          <strong>{numberFormatter.format(tierCounts[1])}</strong>
          <small>Tier 1</small>
        </article>

        <article className="metric-card">
          <span>Additional constraints</span>
          <strong>{numberFormatter.format(tierCounts[2] + tierCounts[3])}</strong>
          <small>Tiers 2–3</small>
        </article>
      </section>

      <section className="filters" aria-labelledby="filters-title">
        <div className="filter-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Screen the register</p>
              <h2 id="filters-title">Filters</h2>
            </div>
            <span className="filter-summary" aria-live="polite">
              Showing {filteredSites.length} of {brownfieldSites.length}
            </span>
          </div>

          <div className="filter-grid">
            <div className="filter-field">
              <label htmlFor="tier-filter">Friction tier</label>
              <select
                id="tier-filter"
                value={tierFilter}
                onChange={(event) => setTierFilter(event.target.value)}
              >
                <option value="all">All tiers</option>
                <option value="0">Tier 0</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="planning-filter">Planning status</label>
              <select
                id="planning-filter"
                value={planningFilter}
                onChange={(event) => setPlanningFilter(event.target.value)}
              >
                <option value="all">All planning statuses</option>
                <option value="permissioned">Permissioned</option>
                <option value="not-permissioned">Not permissioned</option>
                <option value="pending-decision">Pending decision</option>
                <option value="missing">Not recorded</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="ownership-filter">Ownership</label>
              <select
                id="ownership-filter"
                value={ownershipFilter}
                onChange={(event) => setOwnershipFilter(event.target.value)}
              >
                <option value="all">All ownership types</option>
                <option value="owned-by-a-public-authority">
                  Public authority
                </option>
                <option value="not-owned-by-a-public-authority">
                  Not publicly owned
                </option>
                <option value="mixed-ownership">Mixed ownership</option>
                <option value="unknown-ownership">Unknown ownership</option>
                <option value="missing">Not recorded</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="capacity-filter">Minimum capacity (homes)</label>
              <input
                id="capacity-filter"
                type="number"
                min="0"
                max="2426"
                step="50"
                inputMode="numeric"
                value={minimumCapacity}
                onChange={(event) =>
                  setMinimumCapacity(
                    Math.max(0, Number(event.target.value) || 0),
                  )
                }
              />
            </div>
          </div>

          <div className="filter-footer">
            <p>
              Missing capacity values remain visible when the minimum is zero.
            </p>
            <button
              type="button"
              className="reset-filters"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset filters
            </button>
          </div>
        </div>
      </section>

      <main className="workspace">
        <section className="tier-legend" aria-labelledby="legend-title">
          <div>
            <p className="section-kicker">Transparent methodology</p>
            <h2 id="legend-title">Friction tiers</h2>
          </div>
          <ul>
            {Object.entries(tierDefinitions).map(([tier, description]) => (
              <li key={tier}>
                <span
                  className="tier-indicator"
                  style={{ backgroundColor: tierColors[tier] }}
                  aria-hidden="true"
                />
                <span>
                  <strong>Tier {tier}</strong>
                  <small>{description}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="tier-note">
            Screening based on six selected planning constraints using each
            site’s representative point. This is not planning due diligence.
          </p>
        </section>

        {filteredSites.length === 0 && (
          <div className="empty-state" role="status">
            <strong>No sites match these filters.</strong>
            <span>Adjust the criteria or reset the filters.</span>
          </div>
        )}

        <section className="explorer" aria-label="Map and ranked opportunities">
          <div className="map-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Spatial view</p>
                <h2>Opportunity map</h2>
              </div>
              <span>{filteredSites.length} markers</span>
            </div>

            <MapContainer
              ref={mapRef}
              center={[51.56, -0.28]}
              zoom={12}
              className="map"
              scrollWheelZoom
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {filteredSites.map((site) => {
                const isSelected = site.entity === selectedEntity;

                return (
                  <CircleMarker
                    key={site.entity}
                    center={[site.latitude, site.longitude]}
                    radius={isSelected ? 9 : 6}
                    pathOptions={{
                      color: tierColors[site.friction_tier],
                      fillColor: tierColors[site.friction_tier],
                      fillOpacity: isSelected ? 0.95 : 0.78,
                      weight: isSelected ? 3 : 1,
                    }}
                    eventHandlers={{
                      click: () => selectSite(site, false),
                    }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{site["site-address"]}</strong>
                        <span>Reference: {site.reference}</span>
                        <span>Friction tier: {site.friction_tier}</span>
                        <span>
                          Maximum homes:{" "}
                          {numberOrFallback(site["maximum-net-dwellings"])}
                        </span>
                        <span>
                          Area: {valueWithUnit(site.hectares, "ha", {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span>
                          Planning:{" "}
                          {displayStatus(site["planning-permission-status"])}
                        </span>
                        {site.density_outlier && <em>Density QA flag</em>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          <aside className="results-panel" aria-labelledby="results-title">
            <div className="panel-heading results-heading">
              <div>
                <p className="section-kicker">Decision view</p>
                <h2 id="results-title">Ranked opportunities</h2>
              </div>
              <label>
                <span>Sort by</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
                >
                  <option value="opportunity">Lower friction + capacity</option>
                  <option value="capacity">Maximum capacity</option>
                  <option value="hectares">Site area</option>
                  <option value="density">Density</option>
                  <option value="address">Address</option>
                </select>
              </label>
            </div>

            {selectedSite ? (
              <SiteDetail
                site={selectedSite}
                onClose={() => setSelectedEntity(null)}
              />
            ) : (
              <div className="detail-placeholder">
                <strong>Select a site</strong>
                <span>Choose a marker or ranked result to inspect it.</span>
              </div>
            )}

            <div className="results-list" aria-label="Ranked site results">
              {sortedSites.length > 0 ? (
                sortedSites.map((site, index) => (
                  <button
                    type="button"
                    className={
                      "result-card" +
                      (site.entity === selectedEntity ? " is-selected" : "")
                    }
                    key={site.entity}
                    onClick={() => selectSite(site)}
                    aria-pressed={site.entity === selectedEntity}
                  >
                    <span className="result-rank">{index + 1}</span>
                    <span className="result-content">
                      <span className="result-title">
                        {site["site-address"]}
                      </span>
                      <span className="result-meta">
                        <span
                          className="result-tier"
                          style={{
                            "--tier-color": tierColors[site.friction_tier],
                          }}
                        >
                          Tier {site.friction_tier}
                        </span>
                        <span>
                          {numberOrFallback(site["maximum-net-dwellings"])} homes
                        </span>
                        <span>
                          {numberOrFallback(site.hectares, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          ha
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="results-empty">
                  No ranked results to display.
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>

      <footer className="footer">
        <p>
          Built from Planning Data records for Brent. Representative-point
          screening only.
        </p>
      </footer>
    </div>
  );
}

function SiteDetail({ site, onClose }) {
  const constraints = getDetectedConstraints(site);

  return (
    <section className="site-detail" aria-labelledby="site-detail-title">
      <div className="site-detail-header">
        <div>
          <span className="site-reference">{site.reference}</span>
          <h3 id="site-detail-title">{site["site-address"]}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close site details">
          ×
        </button>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Entity ID</dt>
          <dd>{site.entity}</dd>
        </div>
        <div>
          <dt>Friction</dt>
          <dd>Tier {site.friction_tier}</dd>
        </div>
        <div>
          <dt>Homes</dt>
          <dd>
            {dwellingRange(
              site["minimum-net-dwellings"],
              site["maximum-net-dwellings"],
            )}
          </dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>
            {valueWithUnit(site.hectares, "ha", {
              maximumFractionDigits: 2,
            })}
          </dd>
        </div>
        <div>
          <dt>Density</dt>
          <dd>
            {valueWithUnit(site.dwellings_per_hectare, "homes/ha", {
              maximumFractionDigits: 1,
            })}
          </dd>
        </div>
        <div>
          <dt>Planning</dt>
          <dd>{displayStatus(site["planning-permission-status"])}</dd>
        </div>
        <div>
          <dt>Ownership</dt>
          <dd>{displayStatus(site["ownership-status"])}</dd>
        </div>
      </dl>

      <div className="constraint-summary">
        <strong>Detected constraints</strong>
        <div className="constraint-list">
          {constraints.length > 0 ? (
            constraints.map((constraint) => (
              <span key={constraint}>{constraint}</span>
            ))
          ) : (
            <span className="constraint-none">None selected by this screen</span>
          )}
        </div>
      </div>

      {site.density_outlier && (
        <div className="density-warning" role="note">
          <strong>Density QA flag</strong>
          <span>This value is unusually high and should be checked.</span>
        </div>
      )}
    </section>
  );
}

export default App;
