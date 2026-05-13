import { access, readFile } from "node:fs/promises";

const requiredFiles = ["dist/index.html", "api/tiktok-oembed.js", "vercel.json"];

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

if (!html.includes("/assets/")) {
  throw new Error("index.html does not include the expected built assets.");
}

console.log("Build check passed.");
