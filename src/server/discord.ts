import { Builder, Browser, Key, By, WebDriver, until, WebElement } from "selenium-webdriver";
import { memoize } from "./utils";

export const getDriver = memoize(async () => {
  return await new Builder().forBrowser(Browser.CHROME).build();
});

const DISCORD_SERVER_URL = "https://discord.com/channels/1059694264189198437/1059694264189198440";
if (process.env.DISCORD_USERNAME == null || process.env.DISCORD_PASSWORD == null) {
  throw new Error("process.env.DISCORD_USERNAME and process.env.DISCORD_PASSWORD must be defined.");
}

const USERNAME = process.env.DISCORD_USERNAME;
const PASSWORD = process.env.DISCORD_PASSWORD;

export async function login() {
  const driver = await getDriver();

  await driver.get(DISCORD_SERVER_URL);

  const emailInput = driver.findElement(By.css(`input[name='email']`));
  emailInput.sendKeys(USERNAME);

  const passwordInput = driver.findElement(By.css(`input[name='password']`));
  passwordInput.sendKeys(PASSWORD);

  const loginButton = driver.findElement(By.css(`button[type='submit']`));
  loginButton.submit();
}

export function makeSeed() {
  return Math.random() * Number.MAX_SAFE_INTEGER;
}

function getMidjourneyPrompt(seed: number, prompt: string): string {
  return `${prompt} --v 4 --seed ${seed} --ar 3:2`;
}

export async function sleep(driver: WebDriver, timeMs: number) {
  const startTimeMs = performance.now();
  driver.wait(function () {
    return performance.now() - timeMs > startTimeMs;
  }, timeMs + 100);
}

export async function enterPrompt(seed: number, prompt: string): Promise<void> {
  const driver = await getDriver();

  const messageInput = await driver.findElement(By.css(`div[role='textbox']`));
  await messageInput.sendKeys(`/imagine`);

  await sleep(driver, 1000);

  const promptDivPath = By.xpath(`//div[text()='prompt']`);
  await driver.wait(until.elementLocated(promptDivPath));

  const promptDiv = await driver.findElement(promptDivPath);
  await promptDiv.click();

  const promptMessage = getMidjourneyPrompt(seed, prompt);
  await messageInput.sendKeys(promptMessage);
  await messageInput.sendKeys(Key.ENTER);
}

export interface ImageResult {
  ready: boolean;
  src?: string;
  progress?: number;
  upscaling?: boolean;
}

// So we don't click the upscale button twice for the same string key.
const seedPromptUpscaleClicked: { [key: string]: boolean } = {};

export async function getImage(seed: number, prompt: string): Promise<ImageResult> {
  const driver = await getDriver();
  const promptMessage = getMidjourneyPrompt(seed, prompt);
  const key = `${seed}_${prompt}`;

  let upscaling = false;

  let progress = 0;
  try {
    const outputPromptPath = By.xpath(`//div[strong[text()='${promptMessage}']]`);
    console.log("found outputPrompt");
    let upscaled = false;

    const outputPrompts = await driver.findElements(outputPromptPath);
    let workingOutputPrompt: WebElement;
    for (const outputPrompt of outputPrompts) {
      const progressMessage = await outputPrompt.getText();
      console.log(progressMessage);

      const upscalingMatch = progressMessage.match(/Upscaling by/);
      const upscaledMatch = progressMessage.match(/Upscaled/);
      const progressMatch = progressMessage.match(/\((([0-9]+)%)\)/);
      const localProgress = +(progressMatch == null ? 0 : progressMatch[2]);

      if (upscalingMatch != null) {
        upscaling = true;
        progress = 50 + localProgress / 2;
        workingOutputPrompt = outputPrompt;

        console.log("Upscaling...");
        break;
      }
      if (upscaledMatch != null) {
        progress = 100;
        upscaled = true;
        workingOutputPrompt = outputPrompt;
        break;
      }
      progress = localProgress / 2;
      workingOutputPrompt = outputPrompt;
    }
    if (progress === 0 && seedPromptUpscaleClicked[key] != null) {
      progress = 50;
    }

    const id = await workingOutputPrompt!.getAttribute("id");
    const messageId = id.substring("message-content-".length);
    console.log("found id, messageId", id, messageId);

    const messageAccessoryId = `message-accessories-${messageId}`;

    if (upscaling) {
      // Image isn't ready yet.
      throw new Error("");
    }

    if (upscaled) {
      const imageOutputPath = By.css(`#${messageAccessoryId} img`);
      const imageOutputs = await driver.findElements(imageOutputPath);
      let finalSrc = "";
      for (let i = 0; i < imageOutputs.length; i++) {
        //await driver.wait(until.elementLocated(upscaleButtonPath));
        const src = await imageOutputs[i].getAttribute("src");
        if (src.startsWith("https://media.discordapp.net/")) {
          finalSrc = src;
          break;
        }
      }
      if (finalSrc === "") {
        // Image isn't ready yet.
        throw new Error("");
      }
      // Full is finally ready!
      return { ready: true, src: finalSrc };
    } else {
      // Wait for the upscale button.
      const upscaleButtonPath = By.xpath(`//div[@id='${messageAccessoryId}']//div[text()='U1']`);
      const upscaleButton = await driver.findElement(upscaleButtonPath);

      if (seedPromptUpscaleClicked[key] == null) {
        await upscaleButton.click();
        seedPromptUpscaleClicked[key] = true;
        console.log("clicked upscale!");
      }
      console.log("skipping click upscale!");

      // Full image isn't ready yet.
      throw new Error("");
    }
  } catch (e) {
    console.log("not ready...");
    return { ready: false, progress: +progress, upscaling };
  }
}

async function destroyWebdriver() {
  const driver = await getDriver();

  await driver.quit();
}
process.on("SIGTERM", destroyWebdriver);
process.on("SIGINT", destroyWebdriver);
