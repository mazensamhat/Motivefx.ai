import { prisma } from "@motivefx/database";
import {
  COUNTRY_CENTROIDS,
  countryDisplayName,
  countryToContinent,
} from "@/lib/geo/continents";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabels(days: number) {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    labels.push(daysAgo(i).toISOString().slice(0, 10));
  }
  return labels;
}

function resolveCoords(user: {
  signupLatitude: number | null;
  signupLongitude: number | null;
  signupCountry: string | null;
}) {
  if (user.signupLatitude != null && user.signupLongitude != null) {
    return { lat: user.signupLatitude, lng: user.signupLongitude };
  }
  if (user.signupCountry) {
    const c = COUNTRY_CENTROIDS[user.signupCountry.toUpperCase()];
    if (c) return { lat: c.lat, lng: c.lng };
  }
  return null;
}

export async function getSiteAdminSnapshot() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      signupCountry: true,
      signupRegion: true,
      signupCity: true,
      signupLatitude: true,
      signupLongitude: true,
      intelligenceTier: true,
      stripeSubscriptionId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const labels = dayLabels(14);
  const signupsByDay = labels.map((day) => ({
    day,
    count: users.filter((u) => u.createdAt.toISOString().slice(0, 10) === day).length,
  }));

  const points: {
    id: string;
    email: string;
    lat: number;
    lng: number;
    city: string | null;
    region: string | null;
    country: string;
    continent: string | null;
    tier: string;
  }[] = [];

  for (const u of users) {
    const coords = resolveCoords(u);
    if (!coords || !u.signupCountry) continue;
    points.push({
      id: u.id,
      email: u.email,
      lat: coords.lat,
      lng: coords.lng,
      city: u.signupCity,
      region: u.signupRegion,
      country: u.signupCountry,
      continent: countryToContinent(u.signupCountry),
      tier: u.intelligenceTier,
    });
  }

  const countryCounts = new Map<string, number>();
  const continentCounts = new Map<string, number>();
  const regionCounts = new Map<string, { country: string; value: string; count: number }>();
  const cityCounts = new Map<string, { country: string; region: string | null; value: string; count: number }>();

  for (const p of points) {
    countryCounts.set(p.country, (countryCounts.get(p.country) ?? 0) + 1);
    if (p.continent) continentCounts.set(p.continent, (continentCounts.get(p.continent) ?? 0) + 1);
    const regionKey = `${p.country}|${p.region ?? ""}`;
    const regionRow = regionCounts.get(regionKey) ?? { country: p.country, value: p.region ?? "Unknown", count: 0 };
    regionRow.count += 1;
    regionCounts.set(regionKey, regionRow);
    const cityKey = `${p.country}|${p.region ?? ""}|${p.city ?? "Unknown"}`;
    const cityRow = cityCounts.get(cityKey) ?? {
      country: p.country,
      region: p.region,
      value: p.city ?? "Unknown",
      count: 0,
    };
    cityRow.count += 1;
    cityCounts.set(cityKey, cityRow);
  }

  const stripeSubs = users.filter((u) => u.stripeSubscriptionId).length;

  return {
    generatedAt: new Date().toISOString(),
    totalUsers: users.length,
    locatedUsers: points.length,
    stripeSubscribers: stripeSubs,
    signupsByDay,
    signupMap: {
      totalUsers: users.length,
      locatedUsers: points.length,
      points,
      filters: {
        continents: [...continentCounts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        countries: [...countryCounts.entries()]
          .map(([value, count]) => ({ value, label: countryDisplayName(value), count }))
          .sort((a, b) => b.count - a.count),
        regions: [...regionCounts.values()].sort((a, b) => b.count - a.count),
        cities: [...cityCounts.values()].sort((a, b) => b.count - a.count),
      },
    },
  };
}
