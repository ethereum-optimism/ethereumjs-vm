"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OOGResult = void 0;
var BN = require("bn.js");
var ethereumjs_util_1 = require("ethereumjs-util");
var exceptions_1 = require("../exceptions");
var precompiles_1 = require("./precompiles");
var eei_1 = require("./eei");
var interpreter_1 = require("./interpreter");
var buffer_utils_1 = require("../ovm/utils/buffer-utils");
var logger_1 = require("../ovm/utils/logger");
var Block = require('ethereumjs-block');
var logger = new logger_1.Logger('ethereumjs-ovm:evm');
function OOGResult(gasLimit) {
    return {
        returnValue: Buffer.alloc(0),
        gasUsed: gasLimit,
        exceptionError: new exceptions_1.VmError(exceptions_1.ERROR.OUT_OF_GAS),
    };
}
exports.OOGResult = OOGResult;
/**
 * EVM is responsible for executing an EVM message fully
 * (including any nested calls and creates), processing the results
 * and storing them to state (or discarding changes in case of exceptions).
 * @ignore
 */
var EVM = /** @class */ (function () {
    function EVM(vm, txContext, block) {
        this._isOvmCall = false;
        this._vm = vm;
        this._state = this._vm.pStateManager;
        this._tx = txContext;
        this._block = block;
        this._refund = new BN(0);
    }
    /**
     * Executes an EVM message, determining whether it's a call or create
     * based on the `to` address. It checkpoints the state and reverts changes
     * if an exception happens during the message execution.
     */
    EVM.prototype.executeMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var slogger, isTargetMessage, result, targetContract, _a, functionName, functionArgs, ovmResult, err, logs, targetAddress;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this._vm._emit('beforeMessage', message)];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this._state.checkpoint()
                            // Some light sanitization, just in case.
                        ];
                    case 2:
                        _b.sent();
                        // Some light sanitization, just in case.
                        message.caller = buffer_utils_1.toAddressBuf(message.caller);
                        if (!message.isOvmEntryMessage()) return [3 /*break*/, 4];
                        message = message.toOvmMessage(this._vm, this._block || new Block());
                        this._isOvmCall = true;
                        // We snapshot the ExecutionManager and StateManager contracts and reset
                        // them later so their state doesn't influence the state trie.
                        return [4 /*yield*/, this._makeContractSnapshot()];
                    case 3:
                        // We snapshot the ExecutionManager and StateManager contracts and reset
                        // them later so their state doesn't influence the state trie.
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        if (this._isOvmCall) {
                            slogger = logger.scope('executeMessage', 'OVM TRANSACTION TRACE');
                        }
                        else {
                            slogger = logger.scope('executeMessage', 'STANDARD TRANSACTION TRACE');
                        }
                        slogger.open();
                        isTargetMessage = !this._targetMessage && message.isTargetMessage();
                        if (isTargetMessage) {
                            this._targetMessage = message;
                        }
                        if (!message.to) return [3 /*break*/, 8];
                        // TODO: Temporary hack until we get dynamic execution addresses.
                        if (buffer_utils_1.toHexString(message.to) === '0x6454c9d69a4721feba60e26a367bd4d56196ee7c') {
                            message.to = this._vm._contracts.ExecutionManager.address;
                        }
                        targetContract = this._vm.getContractName(message.to);
                        slogger.log("Processing a message call to: " + buffer_utils_1.toHexString(message.to) + " (" + targetContract + ")");
                        // Just some basic logging here.
                        if (targetContract === 'ExecutionManager') {
                            _a = this._vm._contracts.ExecutionManager.decodeFunctionData(message.data), functionName = _a.functionName, functionArgs = _a.functionArgs;
                            slogger.log("Calling ExecutionManager function " + functionName + " with arguments " + functionArgs);
                        }
                        return [4 /*yield*/, this._executeCall(message)
                            // We need to hook into calls to the StateManager so that we manipulate
                            // the VM's state manager, not just the contract.
                        ];
                    case 5:
                        result = _b.sent();
                        if (!(targetContract === 'StateManager')) return [3 /*break*/, 7];
                        return [4 /*yield*/, this._vm._ovmStateManager.handleCall(message)];
                    case 6:
                        ovmResult = _b.sent();
                        result.execResult.returnValue = ovmResult;
                        _b.label = 7;
                    case 7: return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this._executeCreate(message)];
                    case 9:
                        result = _b.sent();
                        _b.label = 10;
                    case 10:
                        // TODO: Move `gasRefund` to a tx-level result object
                        // instead of `ExecResult`.
                        result.execResult.gasRefund = this._refund.clone();
                        err = result.execResult.exceptionError;
                        if (!err) return [3 /*break*/, 12];
                        result.execResult.logs = [];
                        return [4 /*yield*/, this._state.revert()];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 12: return [4 /*yield*/, this._state.commit()];
                    case 13:
                        _b.sent();
                        _b.label = 14;
                    case 14: return [4 /*yield*/, this._vm._emit('afterMessage', result)
                        // Store the result of executing our target message for later.
                    ];
                    case 15:
                        _b.sent();
                        // Store the result of executing our target message for later.
                        if (isTargetMessage) {
                            this._targetMessageResult = result;
                        }
                        if (!message.isOvmEntryMessage()) return [3 /*break*/, 18];
                        if (!this._targetMessageResult) return [3 /*break*/, 17];
                        // Reset the state of our ExecutionManager and StateManager contracts
                        // so that they don't influence the state trie.
                        return [4 /*yield*/, this._resetContractSnapshot()
                            // Address attached to any logs will be the ExecutionManager by default.
                            // We need to replace these addresses with the target address so
                            // clients can properly detect and decode them.
                        ];
                    case 16:
                        // Reset the state of our ExecutionManager and StateManager contracts
                        // so that they don't influence the state trie.
                        _b.sent();
                        logs = [];
                        if (this._targetMessageResult.execResult.logs) {
                            logs = this._targetMessageResult.execResult.logs.map(function (log) {
                                log[0] =
                                    _this._targetMessage.to ||
                                        _this._targetMessageResult.createdAddress;
                                return log;
                            });
                        }
                        // Attach the corrected values to our result.
                        result = __assign(__assign({}, result), { createdAddress: this._targetMessageResult.createdAddress, execResult: __assign(__assign({}, result.execResult), { returnValue: this._targetMessageResult.execResult.returnValue, logs: logs }) });
                        return [3 /*break*/, 18];
                    case 17:
                        targetAddress = message.originalTargetAddress
                            ? buffer_utils_1.toHexString(message.originalTargetAddress)
                            : 'CONTRACT CREATION';
                        slogger.log("ERROR: Execution failed to reach target address: " + targetAddress);
                        if (!err) {
                            throw new Error("Execution failed to reach target address: " + targetAddress);
                        }
                        _b.label = 18;
                    case 18:
                        slogger.close();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    EVM.prototype._executeCall = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var account, toAccount, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._state.getAccount(message.caller)
                        // Reduce tx value from sender
                    ];
                    case 1:
                        account = _a.sent();
                        if (!!message.delegatecall) return [3 /*break*/, 3];
                        return [4 /*yield*/, this._reduceSenderBalance(account, message)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this._state.getAccount(message.to)
                        // Add tx value to the `to` account
                    ];
                    case 4:
                        toAccount = _a.sent();
                        if (!!message.delegatecall) return [3 /*break*/, 6];
                        return [4 /*yield*/, this._addToBalance(toAccount, message)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: 
                    // Load code
                    return [4 /*yield*/, this._loadCode(message)];
                    case 7:
                        // Load code
                        _a.sent();
                        if (!message.code || message.code.length === 0) {
                            return [2 /*return*/, {
                                    gasUsed: new BN(0),
                                    execResult: {
                                        gasUsed: new BN(0),
                                        returnValue: Buffer.alloc(0),
                                    },
                                }];
                        }
                        if (!message.isCompiled) return [3 /*break*/, 8];
                        result = this.runPrecompile(message.code, message.data, message.gasLimit);
                        return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this.runInterpreter(message)];
                    case 9:
                        result = _a.sent();
                        _a.label = 10;
                    case 10: return [2 /*return*/, {
                            gasUsed: result.gasUsed,
                            execResult: result,
                        }];
                }
            });
        });
    };
    EVM.prototype._executeCreate = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var account, _a, toAccount, newContractEvent, result, totalGas, returnFee;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this._state.getAccount(message.caller)
                        // Reduce tx value from sender
                    ];
                    case 1:
                        account = _b.sent();
                        // Reduce tx value from sender
                        return [4 /*yield*/, this._reduceSenderBalance(account, message)];
                    case 2:
                        // Reduce tx value from sender
                        _b.sent();
                        message.code = message.data;
                        message.data = Buffer.alloc(0);
                        _a = message;
                        return [4 /*yield*/, this._generateAddress(message)];
                    case 3:
                        _a.to = _b.sent();
                        return [4 /*yield*/, this._state.getAccount(message.to)
                            // Check for collision
                        ];
                    case 4:
                        toAccount = _b.sent();
                        // Check for collision
                        if ((toAccount.nonce && new BN(toAccount.nonce).gtn(0)) ||
                            toAccount.codeHash.compare(ethereumjs_util_1.KECCAK256_NULL) !== 0) {
                            return [2 /*return*/, {
                                    gasUsed: message.gasLimit,
                                    createdAddress: message.to,
                                    execResult: {
                                        returnValue: Buffer.alloc(0),
                                        exceptionError: new exceptions_1.VmError(exceptions_1.ERROR.CREATE_COLLISION),
                                        gasUsed: message.gasLimit,
                                    },
                                }];
                        }
                        return [4 /*yield*/, this._state.clearContractStorage(message.to)];
                    case 5:
                        _b.sent();
                        newContractEvent = {
                            address: message.to,
                            code: message.code,
                        };
                        return [4 /*yield*/, this._vm._emit('newContract', newContractEvent)];
                    case 6:
                        _b.sent();
                        return [4 /*yield*/, this._state.getAccount(message.to)];
                    case 7:
                        toAccount = _b.sent();
                        if (!this._isOvmCall) {
                            toAccount.nonce = new BN(toAccount.nonce).addn(1).toArrayLike(Buffer);
                        }
                        // Add tx value to the `to` account
                        return [4 /*yield*/, this._addToBalance(toAccount, message)];
                    case 8:
                        // Add tx value to the `to` account
                        _b.sent();
                        if (!message.code || message.code.length === 0) {
                            return [2 /*return*/, {
                                    gasUsed: new BN(0),
                                    createdAddress: message.to,
                                    execResult: {
                                        gasUsed: new BN(0),
                                        returnValue: Buffer.alloc(0),
                                    },
                                }];
                        }
                        return [4 /*yield*/, this.runInterpreter(message)
                            // fee for size of the return value
                        ];
                    case 9:
                        result = _b.sent();
                        totalGas = result.gasUsed;
                        if (!result.exceptionError) {
                            returnFee = new BN(result.returnValue.length * this._vm._common.param('gasPrices', 'createData'));
                            totalGas = totalGas.add(returnFee);
                        }
                        // if not enough gas
                        if (totalGas.lte(message.gasLimit) &&
                            (this._vm.allowUnlimitedContractSize || result.returnValue.length <= 24576)) {
                            result.gasUsed = totalGas;
                        }
                        else {
                            result = __assign(__assign({}, result), OOGResult(message.gasLimit));
                        }
                        if (!(!result.exceptionError && result.returnValue && result.returnValue.toString() !== '')) return [3 /*break*/, 11];
                        return [4 /*yield*/, this._state.putContractCode(message.to, result.returnValue)];
                    case 10:
                        _b.sent();
                        _b.label = 11;
                    case 11: return [2 /*return*/, {
                            gasUsed: result.gasUsed,
                            createdAddress: message.to,
                            execResult: result,
                        }];
                }
            });
        });
    };
    /**
     * Starts the actual bytecode processing for a CALL or CREATE, providing
     * it with the [[EEI]].
     */
    EVM.prototype.runInterpreter = function (message, opts) {
        if (opts === void 0) { opts = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var intEnv, _a, eei, oldRefund, interpreter, interpreterRes, result, gasUsed;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = {
                            blockchain: this._vm.blockchain,
                            address: message.to || ethereumjs_util_1.zeros(32),
                            caller: message.caller || ethereumjs_util_1.zeros(32),
                            callData: message.data || Buffer.from([0]),
                            callValue: message.value || new BN(0),
                            code: message.code,
                            isStatic: message.isStatic || false,
                            depth: message.depth || 0,
                            gasPrice: this._tx.gasPrice,
                            origin: this._tx.origin || message.caller || ethereumjs_util_1.zeros(32),
                            block: this._block || new Block()
                        };
                        return [4 /*yield*/, this._state.getAccount(message.to || ethereumjs_util_1.zeros(32))];
                    case 1:
                        intEnv = (_a.contract = _b.sent(),
                            _a.codeAddress = message.codeAddress,
                            _a.originalTargetAddress = message.originalTargetAddress,
                            _a.isOvmCall = this._isOvmCall,
                            _a);
                        eei = new eei_1.default(intEnv, this._state, this, this._vm._common, message.gasLimit.clone());
                        if (message.selfdestruct) {
                            eei._result.selfdestruct = message.selfdestruct;
                        }
                        oldRefund = this._refund.clone();
                        interpreter = new interpreter_1.default(this._vm, eei);
                        return [4 /*yield*/, interpreter.run(message.code, opts)];
                    case 2:
                        interpreterRes = _b.sent();
                        result = eei._result;
                        gasUsed = message.gasLimit.sub(eei._gasLeft);
                        if (interpreterRes.exceptionError) {
                            if (interpreterRes.exceptionError.error !== exceptions_1.ERROR.REVERT) {
                                gasUsed = message.gasLimit;
                            }
                            // Clear the result on error
                            result = __assign(__assign({}, result), { logs: [], selfdestruct: {} });
                            // Revert gas refund if message failed
                            this._refund = oldRefund;
                        }
                        return [2 /*return*/, __assign(__assign({}, result), { runState: __assign(__assign(__assign({}, interpreterRes.runState), result), eei._env), exceptionError: interpreterRes.exceptionError, gas: eei._gasLeft, gasUsed: gasUsed, returnValue: result.returnValue ? result.returnValue : Buffer.alloc(0) })];
                }
            });
        });
    };
    /**
     * Returns code for precompile at the given address, or undefined
     * if no such precompile exists.
     */
    EVM.prototype.getPrecompile = function (address) {
        return precompiles_1.getPrecompile(address.toString('hex'));
    };
    /**
     * Executes a precompiled contract with given data and gas limit.
     */
    EVM.prototype.runPrecompile = function (code, data, gasLimit) {
        if (typeof code !== 'function') {
            throw new Error('Invalid precompile');
        }
        var opts = {
            data: data,
            gasLimit: gasLimit,
            _common: this._vm._common,
        };
        return code(opts);
    };
    EVM.prototype._loadCode = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var precompile, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!message.code) return [3 /*break*/, 3];
                        precompile = this.getPrecompile(message.codeAddress);
                        if (!precompile) return [3 /*break*/, 1];
                        message.code = precompile;
                        message.isCompiled = true;
                        return [3 /*break*/, 3];
                    case 1:
                        _a = message;
                        return [4 /*yield*/, this._state.getContractCode(message.codeAddress)];
                    case 2:
                        _a.code = _b.sent();
                        message.isCompiled = false;
                        _b.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    EVM.prototype._generateAddress = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var addr, _a, _b, acc, newNonce;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this._isOvmCall) return [3 /*break*/, 2];
                        _a = buffer_utils_1.fromHexString;
                        _b = buffer_utils_1.toHexAddress;
                        return [4 /*yield*/, this._vm.pStateManager.getContractStorage(this._vm._contracts.ExecutionManager.address, Buffer.from('00'.repeat(31) + '05', 'hex'))];
                    case 1:
                        // We're inside an OVM call, so we need to deploy to the address defined
                        // within the ExecutionManager's execution context. We retrieve this
                        // address by directly querying the state trie (as opposed to sending a
                        // contract call transaction) as to not modify the trie.
                        addr = _a.apply(void 0, [_b.apply(void 0, [_c.sent()])]);
                        return [3 /*break*/, 5];
                    case 2:
                        if (!message.salt) return [3 /*break*/, 3];
                        addr = ethereumjs_util_1.generateAddress2(message.caller, message.salt, message.code);
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this._state.getAccount(message.caller)];
                    case 4:
                        acc = _c.sent();
                        newNonce = new BN(acc.nonce).subn(1);
                        addr = ethereumjs_util_1.generateAddress(message.caller, newNonce.toArrayLike(Buffer));
                        _c.label = 5;
                    case 5: return [2 /*return*/, addr];
                }
            });
        });
    };
    EVM.prototype._reduceSenderBalance = function (account, message) {
        return __awaiter(this, void 0, void 0, function () {
            var newBalance;
            return __generator(this, function (_a) {
                newBalance = new BN(account.balance).sub(message.value);
                //account.balance = toBuffer(newBalance)
                return [2 /*return*/, this._state.putAccount(ethereumjs_util_1.toBuffer(message.caller), account)];
            });
        });
    };
    EVM.prototype._addToBalance = function (toAccount, message) {
        return __awaiter(this, void 0, void 0, function () {
            var newBalance;
            return __generator(this, function (_a) {
                newBalance = new BN(toAccount.balance).add(message.value);
                if (newBalance.gt(ethereumjs_util_1.MAX_INTEGER)) {
                    throw new Error('Value overflow');
                }
                //toAccount.balance = toBuffer(newBalance)
                // putAccount as the nonce may have changed for contract creation
                return [2 /*return*/, this._state.putAccount(ethereumjs_util_1.toBuffer(message.to), toAccount)];
            });
        });
    };
    EVM.prototype._touchAccount = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var acc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._state.getAccount(address)];
                    case 1:
                        acc = _a.sent();
                        return [2 /*return*/, this._state.putAccount(address, acc)];
                }
            });
        });
    };
    EVM.prototype._makeContractSnapshot = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this._vm.pStateManager.getAccount(this._vm._contracts.ExecutionManager.address)];
                    case 1:
                        _a._initialEMState = _c.sent();
                        _b = this;
                        return [4 /*yield*/, this._vm.pStateManager.getAccount(this._vm._contracts.StateManager.address)];
                    case 2:
                        _b._initialSMState = _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    EVM.prototype._resetContractSnapshot = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._vm.pStateManager.clearContractStorage(this._vm._contracts.StateManager.address)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._vm.pStateManager.putAccount(this._vm._contracts.ExecutionManager.address, this._initialEMState)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this._vm.pStateManager.putAccount(this._vm._contracts.StateManager.address, this._initialSMState)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return EVM;
}());
exports.default = EVM;
//# sourceMappingURL=evm.js.map