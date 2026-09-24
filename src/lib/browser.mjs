// Headless Chrome helper (puppeteer-core). Finds a Chrome on this machine: env CHROME_PATH,
// the puppeteer cache (chrome-headless-shell), or system Chrome.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), ".cache/puppeteer/chrome-headless-shell");
  if (fs.existsSync(cache)) {
    const vers = fs.readdirSync(cache).sort().reverse();
    for (const v of vers) {
      for (const sub of fs.readdirSync(path.join(cache, v))) {
        const bin = path.join(cache, v, sub, "chrome-headless-shell");
        if (fs.existsSync(bin)) return bin;
      }
    }
  }
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No Chrome found. Set CHROME_PATH.");
}

export async function withPage(fn, { width = 1920, height = 1080 } = {}) {
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox", "--allow-file-access-from-files", "--disable-web-security"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    return await fn(page);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Render a grid of candidate logo files (svg/png) to one labelled PNG for a vision model.
export async function logoSheet(files, outPng) {
  const cells = files
    .map((f, i) => `<div class="c"><div class="i"><img src="${pathToFileURL(f).href}"></div><div class="d"><img src="${pathToFileURL(f).href}"></div><b>${i}</b></div>`)
    .join("");
  const html = `<html><body style="margin:0;font:600 22px sans-serif;background:#ddd"><style>.c{display:inline-block;width:300px;margin:6px;background:#fff;position:relative;vertical-align:top}.i,.d{height:110px;display:flex;align-items:center;justify-content:center;padding:10px}.d{background:#111}.i img,.d img{max-width:260px;max-height:90px}b{position:absolute;left:6px;top:4px;color:#e0245e}</style>${cells}</body></html>`;
  const tmp = outPng.replace(/\.png$/, ".html");
  fs.writeFileSync(tmp, html);
  await withPage(async (page) => {
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "load", timeout: 30000 });
    await page.screenshot({ path: outPng, fullPage: true });
  }, { width: 1280, height: 400 });
  return outPng;
}

// Load a built composition and read the SFX cues the engine exported into the DOM.
export async function readCues(indexHtml) {
  return withPage(async (page) => {
    await page.goto(pathToFileURL(indexHtml).href, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => window.EM_READY === true, { timeout: 30000 });
    return page.evaluate(() => JSON.parse(document.getElementById("em-cues")?.textContent || "[]"));
  });
}
