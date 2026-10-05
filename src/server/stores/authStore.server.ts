import { env } from "#/env";
import z from "zod";
import { produce } from "immer";
import { Store } from "./stores.server";
import { Dashboard } from "../userConfiguration";

// schema

export const User = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  username: z.string(),
  password: z.string(), // make this more secure, e.g. hashed with salt
  admin: z.boolean().default(false),
  dashboard: Dashboard.default(
    Dashboard.parse({} satisfies z.input<typeof Dashboard>),
  ),
});
export type User = z.infer<typeof User>;

export const Share = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  ownerId: z.string(),
  path: z.string(), // todo: gitignore-style path matching
  note: z.string().optional(),
  password: z.string().nullable(),
  allowWrite: z.boolean().default(false),
});
export type Share = z.infer<typeof Share>;

export const AuthStoreSchema = z.object({
  adminPassword: z
    .string()
    .default(() => crypto.randomUUID().replace(/-/g, "")),
  users: z.array(User).default([]),
  shares: z.array(Share).default([]),
});

// share tokens

const ShareToken = z.object({
  sharePath: z.string(),
  sharePassword: z.string(),
});
function getShareToken(share: Share) {
  return share.password
    ? Buffer.from(
        JSON.stringify({
          sharePath: share.path,
          sharePassword: share.password,
        } satisfies z.infer<typeof ShareToken>),
      ).toString("base64")
    : null;
}
function readShareToken(shareToken: string) {
  try {
    return ShareToken.parse(
      JSON.parse(Buffer.from(shareToken, "base64").toString("utf-8")),
    );
  } catch (e) {
    return null;
  }
}

// api

const authStore = await Store.fromFile(
  Bun.file(`${env.paths.data}/auth.json`),
  AuthStoreSchema,
  {},
);

/* export async function isAdminPassword(password: string): Promise<boolean> {
  const authStore = await readAuthStore();
  return authStore.adminPassword === password;
}

export async function createUser(user: Omit<z.input<typeof User>, "id">) {
  const authStore = await readAuthStore();
  const newUser = User.parse(user satisfies z.input<typeof User>);
  authStore.users.push(newUser);
  await writeAuthStore(authStore);
} */

export function verifyUser(username: string, password: string) {
  const user = authStore
    .read()
    .users.find((u) => u.username === username && u.password === password);
  return user || null;
}

const shareWithToken = (share: Share) => ({
  ...share,
  token: getShareToken(share),
});

export function getShares() {
  return authStore.read().shares.map(shareWithToken);
}

export function resolveShareToken(shareToken: string) {
  const deserializedToken = readShareToken(shareToken);
  if (!deserializedToken) return null;
  const share = authStore
    .read()
    .shares.find(
      (s) =>
        s.path === deserializedToken.sharePath &&
        s.password === deserializedToken.sharePassword,
    );
  if (!share) return null;
  return shareWithToken(share);
}

/**
 * Must be rate limited for security!
 */
export function getShareTokenForPathOrParent(
  path: string,
  sharePassword: string,
) {
  const share = authStore
    .read()
    .shares.find(
      (s) => path.startsWith(s.path) && s.password === sharePassword,
    );
  if (!share) return null;
  return getShareToken(share);
}

export function createShare(share: z.input<typeof Share>) {
  const newShare = Share.parse(share satisfies z.input<typeof Share>);
  authStore.write(
    produce((authStore) => {
      authStore.shares.push(newShare);
    }),
  );
  return shareWithToken(newShare);
}

export function deleteShare(shareId: string) {
  authStore.write(
    produce((authStore) => {
      const index = authStore.shares.findIndex((s) => s.id === shareId);
      if (index === -1) throw new Error("Share not found");
      authStore.shares.splice(index, 1);
    }),
  );
}

export function setDashboard(userId: string, dashboard: Dashboard) {
  authStore.write(
    produce((authStore) => {
      const user = authStore.users.find((u) => u.id === userId);
      if (!user) throw new Error("User not found");
      user.dashboard = Dashboard.parse(
        dashboard satisfies z.input<typeof Dashboard>,
      );
    }),
  );
}
