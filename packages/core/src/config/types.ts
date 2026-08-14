export type ConfigFs = {
  exists: (path: string) => Promise<boolean>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, contents: string) => Promise<void>;
  mkdirp: (path: string) => Promise<void>;
};
