export function readUserKeyFromLocalStorage(): string | null {
  return localStorage.getItem("flies-user-key");
}

export function writeUserKeyToLocalStorage(key: string) {
  localStorage.setItem("flies-user-key", key);
}

/* export function readDeviceNameFromLocalStorage(): string | null {
  return localStorage.getItem("flies-device-name");
}

export function writeDeviceNameToLocalStorage(name: string) {
  localStorage.setItem("flies-device-name", name);
} */
