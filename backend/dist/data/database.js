"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepository = getRepository;
exports.getRepositoryInfo = getRepositoryInfo;
const env_1 = require("../config/env");
const firebaseProvider_1 = require("./providers/firebaseProvider");
const memoryProvider_1 = require("./providers/memoryProvider");
const mongoProvider_1 = require("./providers/mongoProvider");
const mysqlProvider_1 = require("./providers/mysqlProvider");
let repository = null;
let activeProvider = env_1.env.DATABASE_PROVIDER;
function createRepository() {
    try {
        switch (env_1.env.DATABASE_PROVIDER) {
            case "mysql":
                activeProvider = "mysql";
                return new mysqlProvider_1.MySqlProvider();
            case "mongodb":
                activeProvider = "mongodb";
                return new mongoProvider_1.MongoProvider();
            case "firebase":
                activeProvider = "firebase";
                return new firebaseProvider_1.FirebaseProvider();
            case "memory":
            default:
                activeProvider = "memory";
                return new memoryProvider_1.MemoryProvider();
        }
    }
    catch (_error) {
        activeProvider = "memory";
        return new memoryProvider_1.MemoryProvider();
    }
}
function getRepository() {
    if (!repository) {
        repository = createRepository();
    }
    return repository;
}
function getRepositoryInfo() {
    return {
        configuredProvider: env_1.env.DATABASE_PROVIDER,
        activeProvider
    };
}
