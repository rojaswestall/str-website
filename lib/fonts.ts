import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";

/*
 * The artifact loads Newsreader at 300/400/500 + italic 300 with the optical
 * size axis. next/font only exposes `axes` for variable fonts, so Newsreader is
 * loaded as a variable font (all weights) to keep `opsz`; the extra weights
 * cost nothing at runtime because the variable file is a single asset.
 */
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

/** Class list that exposes all three font variables; apply to `<html>`. */
export const fontVariables = [
  newsreader.variable,
  plexSans.variable,
  plexMono.variable,
].join(" ");
