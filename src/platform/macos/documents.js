import { rejectUnavailable } from "./unavailable";
export const pick = rejectUnavailable("File import");
export const keepLocalCopy = rejectUnavailable("File import");
export const types = { allFiles: "*/*" };
export const errorCodes = { OPERATION_CANCELED: "OPERATION_CANCELED" };
export const isErrorWithCode = (error) => typeof error?.code === "string";
