import { access, readFile } from "node:fs/promises";

const requiredFiles = ["index.html", "styles.css", "app.js", "vercel.json"];

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

if (!html.includes('src="/app.js"') || !html.includes('href="/styles.css"')) {
  throw new Error("index.html does not include the expected app assets.");
}

console.log("Build check passed.");
