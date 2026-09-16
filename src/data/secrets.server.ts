import z from "zod";
import { sign, unsign } from "@orpc/server/helpers";
import { env } from "#/env";

const Secrets = z.object({
  signingSecret: z.string(),
  adminPassword: z.string(),
});

async function readSecrets() {
  try {
    return Secrets.parse(await Bun.file(`${env.DATA_DIR}/secrets.json`).json());
  } catch (error) {
    throw new Error("Failed to read secrets from secrets.json: " + error);
  }
}
readSecrets();

export async function isAdminPassword(password: string) {
  const secrets = await readSecrets();
  return secrets.adminPassword === password;
}

export async function signData(data: string) {
  const secrets = await readSecrets();
  return sign(data, secrets.signingSecret);
}

export async function unsignData(signedData: string) {
  const secrets = await readSecrets();
  return unsign(signedData, secrets.signingSecret);
}
