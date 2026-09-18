import type z from "zod";

export class Store<T extends z.ZodObject> {
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
