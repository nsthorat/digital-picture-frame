import fs from 'fs';

export const getImagesByDate = async (dir: string) => {
    const files = await fs.promises.readdir(dir);
  
    return files
      .map(fileName => ({
        name: fileName,
        time: fs.statSync(`${dir}/${fileName}`).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time)
      .map(file => {
        return {mtime: file.time, filename: file.name};
    });
  };
  