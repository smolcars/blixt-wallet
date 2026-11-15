const noop = async () => {};
const alwaysTrue = async () => true;
const emptyList = async () => [];
const emptyString = async () => "";
const emptyBuffer = async () => "";

export const MainBundlePath = "/";
export const CachesDirectoryPath = "/tmp";
export const DocumentDirectoryPath = "/";
export const ExternalDirectoryPath = "/";
export const ExternalStorageDirectoryPath = "/";
export const TemporaryDirectoryPath = "/tmp";
export const LibraryDirectoryPath = "/";
export const PicturesDirectoryPath = "/";

export const mkdir = noop;
export const moveFile = noop;
export const copyFile = noop;
export const pathForBundle = emptyString;
export const pathForGroup = emptyString;
export const getFSInfo = async () => ({ freeSpace: 0, totalSpace: 0 });
export const getAllExternalFilesDirs = emptyList;
export const unlink = noop;
export const exists = alwaysTrue;
export const stopDownload = noop;
export const resumeDownload = noop;
export const isResumable = alwaysTrue;
export const stopUpload = noop;
export const completeHandlerIOS = noop;
export const readDir = emptyList;
export const readDirAssets = emptyList;
export const existsAssets = alwaysTrue;
export const readdir = emptyList;
export const setReadable = noop;
export const stat = async () => ({ isFile: () => true, isDirectory: () => false, size: 0 });
export const readFile = emptyBuffer;
export const read = emptyBuffer;
export const readFileAssets = emptyBuffer;
export const hash = emptyString;
export const copyFileAssets = noop;
export const copyFileAssetsIOS = noop;
export const copyAssetsVideoIOS = noop;
export const writeFile = noop;
export const appendFile = noop;
export const write = noop;
export const downloadFile = async () => ({ jobId: 0, promise: Promise.resolve({}) });
export const uploadFiles = async () => ({ jobId: 0, promise: Promise.resolve({}) });
export const touch = noop;

const fs = {
  mkdir,
  moveFile,
  copyFile,
  pathForBundle,
  pathForGroup,
  getFSInfo,
  getAllExternalFilesDirs,
  unlink,
  exists,
  stopDownload,
  resumeDownload,
  isResumable,
  stopUpload,
  completeHandlerIOS,
  readDir,
  readDirAssets,
  existsAssets,
  readdir,
  setReadable,
  stat,
  readFile,
  read,
  readFileAssets,
  hash,
  copyFileAssets,
  copyFileAssetsIOS,
  copyAssetsVideoIOS,
  writeFile,
  appendFile,
  write,
  downloadFile,
  uploadFiles,
  touch,
  MainBundlePath,
  CachesDirectoryPath,
  DocumentDirectoryPath,
  ExternalDirectoryPath,
  ExternalStorageDirectoryPath,
  TemporaryDirectoryPath,
  LibraryDirectoryPath,
  PicturesDirectoryPath,
};

export default fs;
