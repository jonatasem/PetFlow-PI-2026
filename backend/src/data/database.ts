import { env } from "../config/env";
import type { DataRepository } from "./repository";
import { FirebaseProvider } from "./providers/firebaseProvider";
import { MemoryProvider } from "./providers/memoryProvider";
import { MongoProvider } from "./providers/mongoProvider";
import { MySqlProvider } from "./providers/mysqlProvider";

let repository: DataRepository | null = null;
let activeProvider = env.DATABASE_PROVIDER;

function createRepository(): DataRepository {
  try {
    switch (env.DATABASE_PROVIDER) {
      case "mysql":
        activeProvider = "mysql";
        return new MySqlProvider();
      case "mongodb":
        activeProvider = "mongodb";
        return new MongoProvider();
      case "firebase":
        activeProvider = "firebase";
        return new FirebaseProvider();
      case "memory":
      default:
        activeProvider = "memory";
        return new MemoryProvider();
    }
  } catch (_error) {
    activeProvider = "memory";
    return new MemoryProvider();
  }
}

export function getRepository() {
  if (!repository) {
    repository = createRepository();
  }

  return repository;
}

export function getRepositoryInfo() {
  return {
    configuredProvider: env.DATABASE_PROVIDER,
    activeProvider
  };
}
