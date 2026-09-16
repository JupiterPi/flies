import { createClientOnlyFn } from "@tanstack/react-start";

export const readUserKeyFromLocalStorage = createClientOnlyFn(
  (): string | null => {
    return localStorage.getItem("flies-user-key");
  },
);

export const writeUserKeyToLocalStorage = createClientOnlyFn((key: string) => {
  localStorage.setItem("flies-user-key", key);
});

/* export function readDeviceNameFromLocalStorage(): string | null {
  return localStorage.getItem("flies-device-name");
}

export function writeDeviceNameToLocalStorage(name: string) {
  localStorage.setItem("flies-device-name", name);
} */
