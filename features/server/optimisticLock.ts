export interface OptimisticLockOptions {
  retryAttempts?: number;
  retryDelayMs?: number;
}

export class OptimisticLockError extends Error {
  constructor(
    public readonly version: number,
    message = "Optimistic lock conflict",
  ) {
    super(message);
    this.name = "OptimisticLockError";
  }
}

export class OptimisticLocker<TVersioned> {
  private readonly maxRetries: number;
  private readonly delayMs: number;

  constructor(options: OptimisticLockOptions = {}) {
    this.maxRetries = options.retryAttempts ?? 3;
    this.delayMs = options.retryDelayMs ?? 100;
  }

  async withLock<K>(
    lockKey: string,
    fn: (version: number) => Promise<K>,
    options?: { initialVersion?: number },
  ): Promise<K> {
    let attempts = 0;
    let currentVersion = options?.initialVersion ?? 0;

    while (attempts <= this.maxRetries) {
      try {
        const result = await fn(currentVersion);
        // In a real implementation, the fn would verify version was unchanged
        return result;
      } catch (error) {
        if (error instanceof OptimisticLockError && attempts < this.maxRetries) {
          attempts++;
          currentVersion = error.version + 1;
          if (this.delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.delayMs * attempts));
          }
        } else {
          throw error;
        }
      }
    }

    throw new OptimisticLockError(currentVersion, "Max retry attempts exceeded");
  }
}
