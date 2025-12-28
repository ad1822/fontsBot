import puppeteer from "puppeteer";
import fs from "fs";

const URL = process.argv[2]
console.log("==> Webpage to scrape: ", URL)

const scrape = async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle0" });

  const rawData = await page.evaluate(() => {
    const rgbToHex = (rgb) => {
      const match = rgb.match(/\d+/g);
      if (!match || match.length < 3) return null;

      const [r, g, b] = match.map(Number);

      return (
        "#" +
        [r, g, b]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("")
      );
    };
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const normalizeText = (text) =>
      text.replace(/\s+/g, " ").trim();

    const elements = Array.from(document.querySelectorAll("*"));

    const items = [];

    for (const el of elements) {
      if (!isVisible(el)) continue;

      const text = normalizeText(el.innerText || "");
      if (!text) continue;

      // avoid container noise
      if (el.children.length > 0) continue;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      items.push({
        text: text.slice(0, 120),
        // tag: el.tagName.toLowerCase(),

        // font
        fontFamily: style.fontFamily.replace(/["']/g, ""),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        // lineHeight: style.lineHeight,
        // letterSpacing: style.letterSpacing,
        color: rgbToHex(style.color),

        // geometry for ordering
        // top: Math.round(rect.top),
        // left: Math.round(rect.left)
      });
    }

    return items;
  });

  rawData.sort((a, b) => {
    const yDiff = a.top - b.top;
    if (Math.abs(yDiff) > 4) return yDiff;
    return a.left - b.left;
  });

  fs.writeFileSync(
    "typography-ordered.json",
    JSON.stringify(rawData, null, 2)
  );

  await browser.close();
  console.log("Ordered typography report generated");
}

scrape()
