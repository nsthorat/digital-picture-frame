import "@shoelace-style/shoelace/dist/themes/light.css";

import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path";

import {
  SlButton,
  SlDetails,
  SlProgressRing,
  SlRadioButton,
  SlRadioGroup,
} from "@shoelace-style/shoelace/dist/react";
import { SlTextarea } from "@shoelace-style/shoelace/dist/react";
import { Settings, Status } from "./types";
setBasePath("/static/shoelace");

function makeSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
async function sleep(timeMs: number): Promise<void> {
  return await new Promise((resolve, _) => {
    setTimeout(() => resolve(), timeMs);
  });
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Display></Display>,
  },
  {
    path: "/prompt",
    element: <Prompt></Prompt>,
  },
]);
function Prompt(): JSX.Element {
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [generatedImageSrc, setGeneratedImageSrc] = React.useState(null);
  const [seed, setSeed] = React.useState(0);
  const [doneReplacingGenerated, setDoneReplacingGenerated] = React.useState(false);
  const [doneReplacingUploaded, setDoneReplacingUploaded] = React.useState(false);
  const [uploadImageBytes, setUploadImageBytes] = React.useState<Uint8Array | null>(null);
  const [uploadImageSrc, setUploadImageSrc] = React.useState<string | null>(null);
  const [uploadImageFilename, setUploadImageFilename] = React.useState<string | null>(null);
  const [settings, setLocalSettings] = React.useState<Settings | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    getStatus().then((status) => {
      setLocalSettings(status.settings);
    });
  }, []);

  async function generate() {
    setLoading(true);
    setGeneratedImageSrc(null);
    const seed = makeSeed();
    setSeed(seed);
    await fetch(`/imagine?prompt=${prompt}&seed=${seed}`);

    let imageDone = false;
    while (!imageDone) {
      const imageResult = await (await fetch(`/get_image?prompt=${prompt}&seed=${seed}`)).json();
      imageDone = imageResult.src != null;
      setGeneratedImageSrc(imageResult.src);
      setProgress(imageResult.progress);
      console.log(imageResult);
      if (!imageDone) {
        await sleep(1000);
      }
    }
    setLoading(false);
  }

  async function replaceImage() {
    await fetch(
      `/download_image?url=${encodeURIComponent(generatedImageSrc!)}&seed=${seed}&prompt=${prompt}`
    );
    setDoneReplacingGenerated(true);
    console.log("done");
    //setImageSrc(null);
    //setPrompt(null);
  }

  async function onFileChange(file: File) {
    const reader = new FileReader();
    reader.onload = function () {
      const arrayBuffer = this.result as ArrayBuffer;
      const array = new Uint8Array(arrayBuffer);
      setUploadImageBytes(array);
      setUploadImageFilename(file.name);
      console.log(array);

      const base64Image = bytesToBase64(array);
      console.log({ base64Image });
      setUploadImageSrc(base64Image);
    };
    reader.readAsArrayBuffer(file!);
  }

  async function replaceImageWithFile() {
    fetch(`/upload_image?filename=${uploadImageFilename}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: uploadImageBytes,
    })
      .then((x) => x.json())
      .then((x) => {
        console.log(x);
        setDoneReplacingUploaded(true);
      });
  }

  async function updateCrop(crop: Settings["crop"]) {
    const result = await (await fetch(`/set_crop?crop=${crop}`)).json();
    console.log(result);
  }
  return (
    <>
      <SlDetails
        className={`custom-icons`}
        summary="Upload Image"
        onSlShow={() => fileInput.current!.click()}
      >
        <div className="interface-container">
          <div className="main-area-row">
            <input
              onChange={(e) => onFileChange((e.target as HTMLInputElement).files![0])}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={fileInput}
            ></input>
            {uploadImageSrc != null ? (
              <img className="preview-image" src={`data:image/png;base64, ${uploadImageSrc}`} />
            ) : (
              <></>
            )}
          </div>
          <div className="main-area-row">
            <SlButton size="large" variant="success" onClick={() => replaceImageWithFile()}>
              Replace image!
            </SlButton>
          </div>
          <div className="main-area-row">
            {doneReplacingUploaded ? <>Done replacing image!</> : <></>}
          </div>
          <div className="main-area-row">
            <SlButton size="large" variant="primary" onClick={() => fileInput.current!.click()}>
              Upload Another Image
            </SlButton>
          </div>
        </div>
      </SlDetails>
      <SlDetails className={`custom-icons`} summary="Create Image">
        <div className="interface-container">
          <div className="main-area-row">
            <div className="title">Create a midjourney image</div>
          </div>
          <div className="main-area-row">
            <SlTextarea
              value={prompt}
              onSlInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
            ></SlTextarea>
          </div>
          <div className="main-area-row">
            <SlButton variant="primary" size="large" onClick={() => generate()}>
              Generate
            </SlButton>
          </div>
          <div className="main-area-row">
            {loading ? (
              <div>
                <SlProgressRing
                  value={progress}
                  style={{ "--size": "100px" } as React.CSSProperties}
                />
                <br></br>
                <br></br>
                <div className="progress">{progress}%</div>
                <br></br>Be patient this may take a few minutes...
              </div>
            ) : (
              <></>
            )}
          </div>
          {generatedImageSrc != null ? (
            <>
              <div className="main-area-row">
                <img className="preview-image" src={generatedImageSrc}></img>
              </div>
              <div className="main-area-row">
                <SlButton size="large" variant="success" onClick={() => replaceImage()}>
                  Replace image
                </SlButton>
              </div>
            </>
          ) : (
            <></>
          )}
          {doneReplacingGenerated ? <>Done replacing image!</> : <></>}
        </div>
      </SlDetails>
      <SlDetails className={`custom-icons`} summary="Settings">
        <div className="interface-container">
          <div className="main-area-row">
            <SlRadioGroup
              onSlChange={(e) =>
                updateCrop((e.target as HTMLInputElement).value as Settings["crop"])
              }
              label="Crop Settings"
              name="a"
              value={settings?.crop}
            >
              <SlRadioButton pill value="center_crop">
                Center Crop
              </SlRadioButton>
              <SlRadioButton pill value="pad">
                Pad
              </SlRadioButton>
            </SlRadioGroup>
          </div>
        </div>
      </SlDetails>
    </>
  );
}

function bytesToBase64(bytes: Uint8Array) {
  var binary = "";
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
async function getStatus(): Promise<Status> {
  return (await (await fetch("/status")).json()) as Status;
}

function Display(): JSX.Element {
  const [latestImage, setLatestImage] = React.useState({ filename: "" });
  const [settings, setSettings] = React.useState<Settings | null>(null);

  React.useEffect(() => {
    async function poll() {
      const status = await getStatus();
      console.log(status);
      setLatestImage(status.images[0]);
      setSettings(status.settings);
      console.log(status.settings);
      setTimeout(poll, 1000);
    }
    poll();
  }, []);
  return (
    <>
      <div className="container">
        <img
          className={settings?.crop === "center_crop" ? "center_cropped" : "padded"}
          src={`/image/${latestImage.filename}`}
        ></img>
      </div>
    </>
  );
}

window.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root") as HTMLDivElement);
  root.render(<RouterProvider router={router} />);
});
