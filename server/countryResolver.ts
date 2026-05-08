import type { Country } from "world-countries";
import countries from "world-countries";

/** IHME / OWID style names that do not match `world-countries` `name.common` exactly. */
const LOCATION_ALIASES: Record<string, string> = {
  "united states of america": "United States",
  "russian federation": "Russia",
  "iran (islamic republic of)": "Iran",
  "venezuela (bolivarian republic of)": "Venezuela",
  "bolivia (plurinational state of)": "Bolivia",
  "tanzania (united republic of)": "Tanzania",
  "lao people's democratic republic": "Laos",
  "viet nam": "Vietnam",
  "democratic republic of the congo": "DR Congo",
  "the democratic republic of the congo": "DR Congo",
  "congo": "Republic of the Congo",
  "republic of the congo": "Republic of the Congo",
  "congo (democratic republic of the)": "DR Congo",
  "czechia": "Czechia",
  "north macedonia": "North Macedonia",
  "republic of korea": "South Korea",
  "republic of moldova": "Moldova",
  "syrian arab republic": "Syria",
  "lao pdr": "Laos",
  "côte d'ivoire": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast",
};

function normalizeLocationKey(raw: string): string {
  const t = raw.trim().toLowerCase();
  const alias = LOCATION_ALIASES[t];
  return (alias ?? raw.trim()).toLowerCase();
}

export function buildCountryResolver(): (location: string) => Country | undefined {
  const byKey = new Map<string, Country>();
  for (const c of countries) {
    byKey.set(c.name.common.toLowerCase(), c);
    for (const a of c.altSpellings) {
      if (a) byKey.set(a.toLowerCase(), c);
    }
  }
  return (location: string) => {
    const k = normalizeLocationKey(location);
    return byKey.get(k);
  };
}

export function countryByCca2(): Map<string, Country> {
  return new Map(countries.map((c) => [c.cca2, c]));
}

export function countryByCca3(): Map<string, Country> {
  return new Map(countries.map((c) => [c.cca3, c]));
}
