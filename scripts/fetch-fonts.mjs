// Gambarino is licensed under the ITF Free Font License, which allows self-hosting
// on our own site but not modifying the font or making it available through a
// public repository. So the official, unmodified file is fetched from Fontshare at
// build time into public/fonts/ (gitignored) instead of being committed.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const target = new URL("../public/fonts/gambarino-regular.woff2", import.meta.url);

if (existsSync(target)) process.exit(0);

const css = await (await fetch("https://api.fontshare.com/v2/css?f[]=gambarino@400&display=swap")).text();
const match = css.match(/url\(['"]?((?:https:)?\/\/[^'")]+\.woff2)['"]?\)/);
if (!match) throw new Error("Gambarino woff2 URL not found in the Fontshare stylesheet");

const url = match[1].startsWith("//") ? `https:${match[1]}` : match[1];
const response = await fetch(url);
if (!response.ok) throw new Error(`Fontshare returned ${response.status} for ${url}`);

mkdirSync(new URL("../public/fonts/", import.meta.url), { recursive: true });
writeFileSync(target, Buffer.from(await response.arrayBuffer()));
console.log(`Fetched Gambarino from ${url}`);
