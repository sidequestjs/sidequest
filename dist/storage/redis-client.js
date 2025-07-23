"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ioredis_1 = __importDefault(require("ioredis"));
var zpopmin_scored_1 = __importDefault(require("./redis-commands/zpopmin_scored"));
var client = new ioredis_1.default();
client.defineCommand('zpopminbyscore', {
    numberOfKeys: 1,
    lua: zpopmin_scored_1.default
});
exports.default = client;
