import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = path.resolve("mobile/store-screenshots/iap-review");
const files = fs.readdirSync(dir).filter((f) => f.startsWith("asc-review-") && f.endsWith(".png") && !f.includes("1284x2778"));

for (const f of files) {
  const out = path.join(dir, f.replace(".png", "-1284x2778.png"));
  await sharp(path.join(dir, f)).resize(1284, 2778, { fit: "cover" }).png().toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${f} -> ${m.width}x${m.height}`);
}
