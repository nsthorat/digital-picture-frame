export interface Settings {
  crop: "center_crop" | "pad";
}

export interface Status {
  images: ImageInfo[];
  settings: Settings;
}

export interface ImageInfo {
  mtime: number;
  filename: string;
}
