export const cache = {
  getOrSet: async <T>(_key: string, factory: () => Promise<T>, _ttl?: number): Promise<T> => {
    return factory();
  },
  set: async (..._args: any[]) => {},
  get: async (..._args: any[]) => null,
  del: async (..._args: any[]) => {},
};

export const redisClient = {
  on: () => {},
  get: async () => null,
  setex: async () => {},
  del: async () => {},
  call: async () => {},
} as any;
