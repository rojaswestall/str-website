/*
 * Public content API. Import from "@/content", not from the data files.
 *
 * Every module is parsed through its zod schema here, at import time, so a
 * bad data file throws during `next build` (and in `pnpm check:content`)
 * instead of rendering wrong. The parsed values are what components receive.
 */
import { areaPicks as rawAreaPicks } from "./area";
import { hosts as rawHosts } from "./hosts";
import { faqs as rawFaqs, policies as rawPolicies } from "./policies";
import { properties as rawProperties } from "./properties";
import { site as rawSite } from "./site";
import { z } from "zod";

import {
  type AreaPick,
  AreaPicksSchema,
  FaqRowsSchema,
  HostsSchema,
  type License,
  PolicyRowsSchema,
  PropertiesSchema,
  type Property,
  SiteConfigSchema,
} from "./types";

export * from "./types";

function parse<T>(
  label: string,
  schema: { parse: (data: unknown) => T },
  data: unknown,
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    const detail =
      error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new Error(`content/${label}.ts failed validation:\n${detail}`, {
      cause: error,
    });
  }
}

const properties = parse("properties", PropertiesSchema, rawProperties);
const hosts = parse("hosts", HostsSchema, rawHosts);
const areaPicks = parse("area", AreaPicksSchema, rawAreaPicks);
const policies = parse("policies", PolicyRowsSchema, rawPolicies);
const faqs = parse("policies", FaqRowsSchema, rawFaqs);
const site = parse("site", SiteConfigSchema, rawSite);

const propertiesBySlug = new Map(properties.map((p) => [p.slug, p]));

// Cross-file checks the per-file schemas cannot see: unique pick ids, and a
// drive time (or an explicit null) from every house to every pick.
{
  const slugs = properties.map((p) => p.slug).sort();
  const ids = new Set<string>();
  for (const pick of areaPicks) {
    if (ids.has(pick.id)) {
      throw new Error(`content/area.ts: duplicate pick id "${pick.id}"`);
    }
    ids.add(pick.id);
    const keys = Object.keys(pick.driveMinutes).sort();
    if (keys.join() !== slugs.join()) {
      throw new Error(
        `content/area.ts: pick "${pick.id}" needs driveMinutes for exactly ${slugs.join(", ")} (has ${keys.join(", ") || "none"})`,
      );
    }
    for (const slug of Object.keys(pick.walkMinutes ?? {})) {
      if (!slugs.includes(slug)) {
        throw new Error(
          `content/area.ts: pick "${pick.id}" has walkMinutes for unknown house "${slug}"`,
        );
      }
    }
  }
}

const licenses: License[] = properties.map((p) => ({
  propertyName: p.name,
  propertySlug: p.slug,
  number: p.strLicense,
  issuer: "City of Austin",
}));

/** All properties in display order (the order in content/properties.ts). */
export function getAllProperties(): readonly Property[] {
  return properties;
}

/** A single property by URL slug, or undefined so the page can call notFound(). */
export function getProperty(slug: string): Property | undefined {
  return propertiesBySlug.get(slug);
}

/** Slugs for generateStaticParams. */
export function getPropertySlugs(): string[] {
  return properties.map((p) => p.slug);
}

export function getHosts() {
  return hosts;
}

export function getAreaPicks() {
  return areaPicks;
}

/** How a guest gets from one house to a pick: a short walk, or a drive. */
export type Travel =
  { mode: "walk"; minutes: number } | { mode: "drive"; minutes: number | null };

/** Walk time from this house when the pick lists one, otherwise drive time. */
export function getTravel(pick: AreaPick, slug: string): Travel {
  const walk = pick.walkMinutes?.[slug];
  if (walk !== undefined) return { mode: "walk", minutes: walk };
  return { mode: "drive", minutes: pick.driveMinutes[slug] ?? null };
}

/**
 * Picks ordered by how close they are to one house: walkable picks first
 * (shortest walk first), then by drive time. Picks without a confirmed time
 * for that house keep their content order, after the timed ones.
 */
export function getAreaPicksNear(slug: string) {
  const rank = (travel: Travel) =>
    travel.minutes === null
      ? Number.POSITIVE_INFINITY
      : travel.mode === "walk"
        ? travel.minutes - 10_000
        : travel.minutes;
  return areaPicks
    .map((pick, index) => ({ pick, index, rank: rank(getTravel(pick, slug)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ pick }) => pick);
}

export function getPolicies() {
  return policies;
}

export function getFaqs() {
  return faqs;
}

/** STR license lines for the footer, one per property. */
export function getLicenses(): readonly License[] {
  return licenses;
}

export function getSite() {
  return site;
}
