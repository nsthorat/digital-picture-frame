import fs from "fs";

export const getImagesByDate = async (dir: string) => {
  const files = await fs.promises.readdir(dir);

  return files
    .map((fileName) => ({
      name: fileName,
      time: fs.statSync(`${dir}/${fileName}`).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)
    .map((file) => {
      return { mtime: file.time, filename: file.name };
    });
};

/** Memoize the response of the function using the args as the key. */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache: { [key: string]: unknown } = {};
  const innerFn = (...args: unknown[]) => {
    const cacheKey = JSON.stringify(args);
    if (cacheKey in cache) {
      return cache[cacheKey];
    }
    const result = fn(...args);
    cache[cacheKey] = result;
    return result;
  };
  return innerFn as unknown as T;
}
