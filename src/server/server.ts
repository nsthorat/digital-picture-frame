import express from "express";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import request from "request";
import { DIST_PATH, DIST_STATIC_PATH, SERVER_PORT, STATIC_FOLDER } from "./constants";
import { enterPrompt, getImage, login } from "./discord";
import { getImagesByDate } from "./utils";
import bodyParser from "body-parser";
import { Settings } from "./web/types";

const argv = yargs(hideBin(process.argv))
  .option("dev", {
    type: "boolean",
    description: "Run in dev mode, which changes where static assets are fetched from.",
  })
  .parseSync();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw({ limit: "50mb" }));

const SETTINGS: Settings = {
  crop: "pad",
};

const indexHtmlPath = argv.dev ? DIST_PATH : __dirname;
const staticPath = argv.dev ? DIST_STATIC_PATH : path.resolve(__dirname, STATIC_FOLDER);

app.use("/static", express.static(staticPath));
app.use("/image", express.static(path.join(process.cwd(), "images")));

app.get("/status", async (_, res) => {
  const folder = path.join(process.cwd(), "images");
  const images = await getImagesByDate(folder);

  res.json({ images, settings: SETTINGS });
});

app.get("/set_crop", async (req, res) => {
  const cropSetting = req.query.crop as Settings["crop"];
  SETTINGS.crop = cropSetting;

  res.json({ settings: SETTINGS });
});

app.get("/imagine", async (req, res) => {
  const prompt = req.query.prompt as string;
  const seed = +(req.query.seed || 0);
  await enterPrompt(seed, prompt);

  res.setHeader("Content-Type", "text/html");
  res.json({ status: "entered" });
});

app.get("/get_image", async (req, res) => {
  const prompt = req.query.prompt as string;
  const seed = +(req.query.seed || 0);
  const imageResult = await getImage(seed, prompt);
  res.json(imageResult);
});

app.get("/download_image", async (req, res) => {
  const prompt = req.query.prompt as string;
  const seed = +(req.query.seed || 0);
  const url = decodeURIComponent(req.query.url as string);
  const filename = path.join(
    process.cwd(),
    "images",
    `${prompt}_${seed}`.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  );

  await download(url, filename);
  res.json({ status: "done", filename });
});

app.post("/upload_image", async (req, res) => {
  const originalFilename = req.query.filename as string;
  const [filename, extension] = originalFilename.split(".");
  // Add the time to avoid filename collisions.
  const newFilename = `${filename}_${performance.now()}.${extension}`;

  const imageBytes = req.body as Buffer;

  const filepath = path.join("images", newFilename);
  fs.writeFileSync(filepath, imageBytes);
  console.log("Wrote file", filepath);
  res.send({ filepath });
});

app.get("/*", (_, res) => {
  res.sendFile(path.resolve(indexHtmlPath, "index.html"));
});

async function download(uri: string, filename: string): Promise<void> {
  const filenameTmp = filename + "_tmp";

  await new Promise((resolve, _) => {
    request.head(uri, function (err: any, res: any, body: any) {
      [err, body];
      console.log("content-type:", res.headers["content-type"]);
      console.log("content-length:", res.headers["content-length"]);

      request(uri).pipe(fs.createWriteStream(filenameTmp)).on("close", resolve);
    });
  });
  fs.renameSync(filenameTmp, filename);
}
async function main() {
  await login();
  app.listen(SERVER_PORT, () => {
    console.log(`Webserver started at http://localhost:${SERVER_PORT}`);
  });
}

main();
