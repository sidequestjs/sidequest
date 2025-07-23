"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var load_tasks_1 = __importDefault(require("../loader/load-tasks"));
var scored_queue_1 = __importDefault(require("../storage/scored_queue"));
var BATCH_SIZE = process.env.SIDEQUEST_BATCH_SIZE || '10';
var started;
function start(queueName) {
    return __awaiter(this, void 0, void 0, function () {
        var tasks, batchSize, queue, loop, processTask;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (started)
                        throw new Error('Worker already started!');
                    started = true;
                    return [4 /*yield*/, (0, load_tasks_1.default)()];
                case 1:
                    tasks = _a.sent();
                    batchSize = parseInt(BATCH_SIZE);
                    if (isNaN(batchSize))
                        batchSize = 10;
                    queue = new scored_queue_1.default(queueName);
                    loop = function () { return __awaiter(_this, void 0, void 0, function () {
                        var result, i, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, queue.pop(batchSize, new Date().getTime())];
                                case 1:
                                    result = _a.sent();
                                    if (!(result.length > 0)) return [3 /*break*/, 7];
                                    i = 0;
                                    _a.label = 2;
                                case 2:
                                    if (!(i < result.length)) return [3 /*break*/, 7];
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, processTask(result[i])];
                                case 4:
                                    _a.sent();
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_1 = _a.sent();
                                    console.error(error_1);
                                    return [3 /*break*/, 6];
                                case 6:
                                    i++;
                                    return [3 /*break*/, 2];
                                case 7:
                                    if (started)
                                        setTimeout(loop, 500);
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    processTask = function (item) { return __awaiter(_this, void 0, void 0, function () {
                        var task, instance;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    task = tasks[item.task];
                                    if (!(task && task.class)) return [3 /*break*/, 2];
                                    instance = new task.class();
                                    instance.id = item.id;
                                    return [4 /*yield*/, instance.execute(item.args)];
                                case 1:
                                    _a.sent();
                                    return [3 /*break*/, 3];
                                case 2: throw new Error("cannot process item: " + item);
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); };
                    loop();
                    return [2 /*return*/];
            }
        });
    });
}
process.on('message', function (message) { return __awaiter(void 0, void 0, void 0, function () {
    var error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                if (!(message.command === 'start')) return [3 /*break*/, 2];
                return [4 /*yield*/, start(message.queue)];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2: return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.log(error_2);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
