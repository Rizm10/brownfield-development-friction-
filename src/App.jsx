import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import brownfieldSites from "./data/brownfield_brent_results.json";
import "./App.css";
const tierColors = {
  0: "#16a34a", // Tier 0 - Green
  1: "#2563eb", // Tier 1 - Blue
  2: "#f59e0b", // Tier 2 - Yellow
  3: "#dc2626", // Tier 3 - Red
};

const tierDefinitions = {
  0: "No selected constraints detected",
  1: "Article 4 only",
  2: "One additional non-Article 4 constraint",
  3: "Two or more non-Article 4 constraints"
}


function App() {
  const totalSites = brownfieldSites.length;
  const tierCounts = brownfieldSites.reduce(
    (acc, site) => {
      acc[site.friction_tier] += 1;
      return acc;
    },
    { 0: 0, 1: 0, 2: 0, 3: 0 }
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Brownfield Development Friction</h1>
          <p>Brent brownfield opportunity screening</p>
        </div>
      </header>

      <section className="metrics">
        <div className="metric-card">
          <span>Active entities</span>
          <strong>{totalSites}</strong>
        </div>

        <div className="metric-card">
          <span>Lower friction</span>
          <strong>{tierCounts[0]}</strong>
        </div>

        <div className="metric-card">
          <span>Article 4 only</span>
          <strong>{tierCounts[1]}</strong>
        </div>

        <div className="metric-card">
          <span>Additional constraints</span>
          <strong>{tierCounts[2] + tierCounts[3]}</strong>
        </div>
      </section>

      <main className="map-wrapper">
        <section className="tier-legend">
          <h2>Friction tiers</h2>
          <ul>
            {Object.entries(tierDefinitions).map(([tier, description]) => (
              <li key={tier}>
                <span
                  className="tier-indicator"
                  style={{ backgroundColor: tierColors[tier] }}
                  aria-hidden="true"
                />
                <strong>Tier {tier}</strong>
                <span className="tier-description">
                  {description}
                </span>
              </li>
            ))}
          </ul>
          <p className="tier-note">
          Screening based on selected constraints. This is not planning due diligence. </p>
        </section>

        <MapContainer
          center={[51.56, -0.28]}
          zoom={12}
          className="map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {brownfieldSites.map((site) => (
            <CircleMarker
              key={site.entity}
              center={[site.latitude, site.longitude]}
              radius={6}
              pathOptions={{
                color: tierColors[site.friction_tier],
                fillColor: tierColors[site.friction_tier],
                fillOpacity: 0.8,
                weight: 1,
              }}
            >
              <Popup>
                <strong>{site["site-address"]}</strong>
                <br />
                <br />
                Reference: {site.reference}
                <br />
                Friction tier: {site.friction_tier}
                <br />
                Max dwellings: {site["maximum-net-dwellings"] ?? "N/A"}
                <br />
                Area: {site.hectares ?? "N/A"} ha
                <br />
                Planning: {site["planning-permission-status"] ?? "N/A"}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

export default App;