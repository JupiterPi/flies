import { env } from "#/env";
import z from "zod";
import { produce } from "immer";

// storage wrapper

class Store<T extends z.ZodObject> {
  private data: z.infer<T> | null = null;

  private constructor(
    private file: Bun.BunFile,
    private schema: T,
    private initialData: z.input<T>,
    private writeDelayMs: number = 100,
  ) {}

  static async fromFile<T extends z.ZodObject>(
    file: Bun.BunFile,
    schema: T,
    initialData: z.input<T>,
    writeDelayMs?: number,
  ) {
    const store = new Store(file, schema, initialData, writeDelayMs);
    await store.init();
    return store;
  }

  private async init() {
    if (!(await this.file.exists())) {
      this.data = this.schema.parse(this.initialData);
      await this.file.write(JSON.stringify(this.data, null, 2));
    } else {
      try {
        this.data = this.schema.parse(await this.file.json());
      } catch (e) {
        throw new Error(`Failed to read store from ${this.file.name}: ${e}`);
      }
    }
  }

  read() {
    if (!this.data) {
      throw new Error("Store not initialized. Call init() first.");
    }
    return this.data;
  }

  private writeTimeout: NodeJS.Timeout | null = null;
  write(data: z.infer<T> | ((data: z.infer<T>) => z.infer<T>)) {
    if (typeof data === "function") {
      const currentData = this.read();
      this.data = data(currentData);
    } else {
      this.data = this.schema.parse(data);
    }

    // write to file after a delay to avoid excessive writes
    if (this.writeTimeout) clearTimeout(this.writeTimeout);
    this.writeTimeout = setTimeout(async () => {
      await this.file.write(JSON.stringify(this.data, null, 2));
    }, this.writeDelayMs);
  }

  // todo: could implement an async function writeNow()
}

// schema

export const User = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  username: z.string(),
  password: z.string(), // make this more secure, e.g. hashed with salt
  admin: z.boolean().default(false),
});
export type User = z.infer<typeof User>;

export const Share = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string(),
  path: z.string(),
  ownerId: z.string(),
});
export type Share = z.infer<typeof Share>;

export const AuthStoreSchema = z.object({
  adminPassword: z
    .string()
    .default(() => crypto.randomUUID().replace(/-/g, "")),
  users: z.array(User).default([]),
  shares: z.array(Share).default([]),
  publicShares: z.array(Share).default([]),
});

// api

const authStore = await Store.fromFile(
  Bun.file(`${env.DATA_DIR}/auth.json`),
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

export function createShare(share: Omit<z.input<typeof Share>, "id">) {
  const newShare = Share.parse(share satisfies z.input<typeof Share>);
  authStore.write(
    produce((authStore) => {
      authStore.shares.push(newShare);
    }),
  );
  return newShare;
}

export async function getShares() {
  return {
    shares: authStore.read().shares,
    publicShares: authStore.read().publicShares,
  };
}
