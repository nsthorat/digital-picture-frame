import "@shoelace-style/shoelace/dist/themes/light.css";

import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path";

import { SlButton, SlProgressRing } from "@shoelace-style/shoelace/dist/react";
import { SlTextarea } from "@shoelace-style/shoelace/dist/react";
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
  const [imageSrc, setImageSrc] = React.useState(null);
  const [seed, setSeed] = React.useState(0);
  const [doneReplacing, setDoneReplacing] = React.useState(false);
  async function generate() {
    setLoading(true);
    setImageSrc(null);
    const seed = makeSeed();
    setSeed(seed);
    await fetch(`/imagine?prompt=${prompt}&seed=${seed}`);

    let imageDone = false;
    while (!imageDone) {
      const imageResult = await (await fetch(`/get_image?prompt=${prompt}&seed=${seed}`)).json();
      imageDone = imageResult.src != null;
      setImageSrc(imageResult.src);
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
      `/download_image?url=${encodeURIComponent(imageSrc!)}&seed=${seed}&prompt=${prompt}`
    );
    setDoneReplacing(true);
    console.log("done");
    //setImageSrc(null);
    //setPrompt(null);
  }

  return (
    <>
      <div className="prompt-container">
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
        {imageSrc != null ? (
          <>
            <div className="main-area-row">
              <img className="preview-image" src={imageSrc}></img>
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
        {doneReplacing ? <>Done replacing image!</> : <></>}
      </div>
    </>
  );
}

function Display(): JSX.Element {
  const [latestImage, setLatestImage] = React.useState({ filename: "" });

  React.useEffect(() => {
    async function poll() {
      const latestImages = await (await fetch("/images")).json();
      console.log(latestImages);
      setLatestImage(latestImages[0]);
      setTimeout(poll, 1000);
    }
    poll();
  }, []);
  return (
    <>
      <div className="container">
        <img className="center_cropped" src={`/image/${latestImage.filename}`}></img>
      </div>
    </>
  );
}

window.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root") as HTMLDivElement);
  root.render(<RouterProvider router={router} />);
});
