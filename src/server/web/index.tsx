import * as React from "react";
import { createRoot } from "react-dom/client";
import './index.css'

function App(): JSX.Element {
  const [latestImage, setLatestImage] = React.useState({filename: ''});

  React.useEffect(() => {
    async function poll() {
      const latestImages = await (await fetch('/images')).json();
      console.log(latestImages);
      setLatestImage(latestImages[0]);
      setTimeout(poll, 1000);
    }
    poll();
  }, []);
  return (<>
    <div className="container">
      <img className="center_cropped" src={`/image/${latestImage.filename}`}></img>
    </div>
  </>);
}

window.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root") as HTMLDivElement);
  root.render(<App></App>);

});
