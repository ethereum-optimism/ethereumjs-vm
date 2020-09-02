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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OvmStateManager = void 0;
/* External Imports */
var BN = require("bn.js");
var buffer_utils_1 = require("./buffer-utils");
var constants_1 = require("./constants");
var logger_1 = require("./logger");
var contracts_1 = require("./contracts");
// TODO: Add comments here
var logger = new logger_1.Logger('ethereumjs-ovm:ovm-state-manager');
var OvmStateManager = /** @class */ (function () {
    function OvmStateManager(opts) {
        this._def = contracts_1.OVM_CONTRACT_DEFS.StateManager;
        this.vm = opts.vm;
        this._handlers = {
            associateCodeContract: this.associateCodeContract.bind(this),
            setStorage: this.setStorage.bind(this),
            getStorage: this.getStorage.bind(this),
            getStorageView: this.getStorageView.bind(this),
            getOvmContractNonce: this.getOvmContractNonce.bind(this),
            getCodeContractBytecode: this.getCodeContractBytecode.bind(this),
            registerCreatedContract: this.registerCreatedContract.bind(this),
            incrementOvmContractNonce: this.incrementOvmContractNonce.bind(this),
            getCodeContractAddressFromOvmAddress: this.getCodeContractAddressFromOvmAddress.bind(this),
        };
    }
    OvmStateManager.prototype.handleCall = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var methodId, fragment, functionArgs, ret, encodedRet;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        methodId = '0x' + message.data.slice(0, 4).toString('hex');
                        fragment = this._def.iface.getFunction(methodId);
                        functionArgs = this._def.iface.decodeFunctionData(fragment, buffer_utils_1.toHexString(message.data));
                        logger.log("Calling function: " + fragment.name + " with args " + functionArgs);
                        return [4 /*yield*/, (_a = this._handlers)[fragment.name].apply(_a, __spread(functionArgs))];
                    case 1:
                        ret = _b.sent();
                        encodedRet = this._def.iface.encodeFunctionResult(fragment, ret);
                        logger.log("Got result: " + encodedRet);
                        return [2 /*return*/, buffer_utils_1.fromHexString(encodedRet)];
                }
            });
        });
    };
    OvmStateManager.prototype.associateCodeContract = function (ovmContractAddress, codeContractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    OvmStateManager.prototype.setStorage = function (ovmContractAddress, slot, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.vm.pStateManager.putContractStorage(buffer_utils_1.fromHexString(ovmContractAddress), buffer_utils_1.fromHexString(slot), buffer_utils_1.fromHexString(value))];
            });
        });
    };
    OvmStateManager.prototype.getStorage = function (ovmContractAddress, slot) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getStorageView(ovmContractAddress, slot)];
            });
        });
    };
    OvmStateManager.prototype.getStorageView = function (ovmContractAddress, slot) {
        return __awaiter(this, void 0, void 0, function () {
            var ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.vm.pStateManager.getContractStorage(buffer_utils_1.fromHexString(ovmContractAddress), buffer_utils_1.fromHexString(slot))];
                    case 1:
                        ret = _a.sent();
                        return [2 /*return*/, [ret.length ? buffer_utils_1.toHexString(ret) : constants_1.NULL_BYTES32]];
                }
            });
        });
    };
    OvmStateManager.prototype.getOvmContractNonce = function (ovmContractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var account;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.vm.pStateManager.getAccount(buffer_utils_1.fromHexString(ovmContractAddress))];
                    case 1:
                        account = _a.sent();
                        return [2 /*return*/, [account.nonce.length ? buffer_utils_1.toHexString(account.nonce) : '0x00']];
                }
            });
        });
    };
    OvmStateManager.prototype.getCodeContractBytecode = function (ovmContractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.vm.pStateManager.getContractCode(buffer_utils_1.fromHexString(ovmContractAddress))];
                    case 1:
                        code = _a.sent();
                        return [2 /*return*/, [buffer_utils_1.toHexString(code)]];
                }
            });
        });
    };
    OvmStateManager.prototype.registerCreatedContract = function (ovmContractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    OvmStateManager.prototype.incrementOvmContractNonce = function (ovmContractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var account;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.vm.pStateManager.getAccount(buffer_utils_1.fromHexString(ovmContractAddress))];
                    case 1:
                        account = _a.sent();
                        account.nonce = new BN(account.nonce).addn(1).toArrayLike(Buffer);
                        return [2 /*return*/, this.vm.pStateManager.putAccount(buffer_utils_1.fromHexString(ovmContractAddress), account)];
                }
            });
        });
    };
    OvmStateManager.prototype.getCodeContractAddressFromOvmAddress = function (ovmContractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, [ovmContractAddress]];
            });
        });
    };
    return OvmStateManager;
}());
exports.OvmStateManager = OvmStateManager;
//# sourceMappingURL=ovm-state-manager.js.map