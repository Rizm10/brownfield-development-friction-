import { readFile } from "node:fs/promises";

const dataUrl = new URL(
  "../src/data/brownfield_brent_results.json",
  import.meta.url,
);
const sites = JSON.parse(await readFile(dataUrl, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(Array.isArray(sites), "Dataset must be an array.");
assert(sites.length === 213, `Expected 213 entities; found ${sites.length}.`);

const entities = new Set(sites.map((site) => site.entity));
assert(entities.size === 213, "Every entity identifier must remain unique.");

const tierCounts = sites.reduce(
  (counts, site) => {
    assert(site.friction_tier in counts, `Unexpected tier: ${site.friction_tier}`);
    counts[site.friction_tier] += 1;
    assert(Number.isFinite(site.latitude), `Invalid latitude for ${site.entity}.`);
    assert(Number.isFinite(site.longitude), `Invalid longitude for ${site.entity}.`);
    return counts;
  },
  { 0: 0, 1: 0, 2: 0, 3: 0 },
);

assert(
  JSON.stringify(tierCounts) === JSON.stringify({ 0: 51, 1: 131, 2: 30, 3: 1 }),
  `Tier distribution changed: ${JSON.stringify(tierCounts)}.`,
);

const normalizedReferences = sites.map((site) =>
  site.reference.trim().replace(/\.0$/, ""),
);
const referenceCounts = normalizedReferences.reduce((counts, reference) => {
  counts.set(reference, (counts.get(reference) ?? 0) + 1);
  return counts;
}, new Map());
const collisionGroups = [...referenceCounts.values()].filter(
  (count) => count > 1,
).length;

assert(
  collisionGroups === 5,
  `Expected five normalized reference-collision groups; found ${collisionGroups}.`,
);

const densityFlags = sites.filter((site) => site.density_outlier).length;
assert(densityFlags === 13, `Expected 13 density flags; found ${densityFlags}.`);

const countBy = (field, value) =>
  sites.filter((site) => site[field] === value).length;
const countAtCapacity = (minimum) =>
  sites.filter((site) => {
    const capacity = site["maximum-net-dwellings"];
    return capacity !== null && capacity !== "" && Number(capacity) >= minimum;
  }).length;

assert(countBy("planning-permission-status", "permissioned") === 114, "Planning count changed.");
assert(countBy("planning-permission-status", "not-permissioned") === 66, "Planning count changed.");
assert(countBy("planning-permission-status", "pending-decision") === 7, "Planning count changed.");
assert(countAtCapacity(50) === 65, "Capacity ≥50 count changed.");
assert(countAtCapacity(100) === 48, "Capacity ≥100 count changed.");
assert(countAtCapacity(500) === 13, "Capacity ≥500 count changed.");
assert(countAtCapacity(2426) === 1, "Capacity ≥2,426 count changed.");
assert(countAtCapacity(2427) === 0, "Capacity ≥2,427 count changed.");

const rankedSites = [...sites].sort(
  (a, b) =>
    a.friction_tier - b.friction_tier ||
    (Number(b["maximum-net-dwellings"]) || -Infinity) -
      (Number(a["maximum-net-dwellings"]) || -Infinity) ||
    a.entity - b.entity,
);
assert(
  rankedSites[0].entity === 1717232,
  `Unexpected first ranked entity: ${rankedSites[0].entity}.`,
);

console.log("Data validation passed.");
console.log(`Entities: ${sites.length}`);
console.log(`Tiers: ${JSON.stringify(tierCounts)}`);
console.log(`Normalized reference collisions: ${collisionGroups}`);
console.log(`Density QA flags: ${densityFlags}`);
console.log(`First default-ranked entity: ${rankedSites[0].entity}`);
