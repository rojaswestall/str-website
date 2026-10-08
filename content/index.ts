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
