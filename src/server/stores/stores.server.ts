import type z from "zod";

export interface StoreFile {
  exists(): Promise<boolean>;
  json(): Promise<any>;
  write(data: string): Promise<void>;
  readonly name: string | undefined;
  isEmpty(): Promise<boolean>;
}

export class Store<T extends z.ZodObject> {
  private data: z.infer<T> | null = null;

  private constructor(
    private file: StoreFile,
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
    const wrapper: StoreFile = {
      exists: () => file.exists(),
      json: () => file.json(),
      write: (data: string) => file.write(data).then(() => {}),
      name: file.name,
      isEmpty: async () => file.size === 0,
    };
    return await Store.fromWrapper(wrapper, schema, initialData, writeDelayMs);
  }
  static async fromWrapper<T extends z.ZodObject>(
    file: StoreFile,
    schema: T,
    initialData: z.input<T>,
    writeDelayMs?: number,
  ) {
    const store = new Store(file, schema, initialData, writeDelayMs);
    await store.init();
    return store;
  }

  private async init() {
    if (!(await this.file.exists()) || (await this.file.isEmpty())) {
      this.data = this.schema.parse(this.initialData);
      await this.file.write(JSON.stringify(this.data, null, 2));
    } else {
      try {
        this.data = this.schema.parse(await this.file.json());
      } catch (e) {
        throw new Error(`Failed to read store from ${this.file.name}: ${e}`);
      }
    }
    await this.save();
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
    this.writeTimeout = setTimeout(() => this.save(), this.writeDelayMs);
  }
  private async save() {
    await this.file.write(JSON.stringify(this.data, null, 2));
  }
}
