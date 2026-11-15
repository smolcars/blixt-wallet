import { rejectUnavailable } from "./unavailable";

export const types = { allFiles: "*/*" };
export const errorCodes = { OPERATION_CANCELED: "OPERATION_CANCELED" };
export const isErrorWithCode = (error) => typeof error?.code === "string";
export const isCancel = (error) =>
  error?.code === errorCodes.OPERATION_CANCELED || error?.code === "DOCUMENT_PICKER_CANCELED";
export const pick = rejectUnavailable("File import");
export const pickSingle = pick;
export const pickDirectory = pick;
export const keepLocalCopy = rejectUnavailable("File import");
export const LocalCopyResponse = {};

export default { types, errorCodes, isErrorWithCode, isCancel, pick, pickSingle, pickDirectory, keepLocalCopy };
