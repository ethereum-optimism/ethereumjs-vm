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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
var BN = require("bn.js");
var exceptions_1 = require("../exceptions");
var memory_1 = require("./memory");
var stack_1 = require("./stack");
var logger_1 = require("../ovm/utils/logger");
var opFns_1 = require("./opFns");
var process_1 = require("process");
var logGas_1 = require("./logGas");
var logger = new logger_1.Logger('ethjs-ovm');
var printNextMem = false;
var padToLengthIfPossible = function (str, len) {
    return str.length > len ? str : str + ' '.repeat(len - str.length);
};
/**
 * Parses and executes EVM bytecode.
 */
var Interpreter = /** @class */ (function () {
    function Interpreter(vm, eei) {
        this._vm = vm; // TODO: remove when not needed
        this._state = vm.pStateManager;
        this._eei = eei;
        this._runState = {
            programCounter: 0,
            opCode: 0xfe,
            memory: new memory_1.default(),
            memoryWordCount: new BN(0),
            highestMemCost: new BN(0),
            stack: new stack_1.default(),
            code: Buffer.alloc(0),
            validJumps: [],
            // TODO: Replace with EEI methods
            _common: this._vm._common,
            stateManager: this._state._wrapped,
            eei: this._eei,
        };
        this._executionLoggers = new Map();
    }
    Interpreter.prototype.run = function (code, opts) {
        if (opts === void 0) { opts = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var pc, err, opCode, e_1, _a, _b, _c, depth, _d, callLogger, stepLogger;
            var e_2, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this._runState.code = code;
                        this._runState.programCounter = opts.pc || this._runState.programCounter;
                        this._runState.validJumps = this._getValidJumpDests(code);
                        pc = this._runState.programCounter;
                        if (pc !== 0 && (pc < 0 || pc >= this._runState.code.length)) {
                            throw new Error('Internal error: program counter not in range');
                        }
                        _f.label = 1;
                    case 1:
                        if (!(this._runState.programCounter < this._runState.code.length)) return [3 /*break*/, 7];
                        opCode = this._runState.code[this._runState.programCounter];
                        this._runState.opCode = opCode;
                        return [4 /*yield*/, this._runStepHook()];
                    case 2:
                        _f.sent();
                        _f.label = 3;
                    case 3:
                        _f.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.runStep()];
                    case 4:
                        _f.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _f.sent();
                        // STOP is not an exception
                        if (e_1.error !== exceptions_1.ERROR.STOP) {
                            err = e_1;
                        }
                        // TODO: Throw on non-VmError exceptions
                        return [3 /*break*/, 7];
                    case 6: return [3 /*break*/, 1];
                    case 7:
                        try {
                            for (_a = __values(this._executionLoggers.entries()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                _c = __read(_b.value, 2), depth = _c[0], _d = _c[1], callLogger = _d.callLogger, stepLogger = _d.stepLogger;
                                callLogger.close();
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        return [2 /*return*/, {
                                runState: this._runState,
                                exceptionError: err,
                            }];
                }
            });
        });
    };
    /**
     * Executes the opcode to which the program counter is pointing,
     * reducing it's base gas cost, and increments the program counter.
     */
    Interpreter.prototype.runStep = function () {
        return __awaiter(this, void 0, void 0, function () {
            var opInfo, opFn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opInfo = this.lookupOpInfo(this._runState.opCode);
                        // Check for invalid opcode
                        if (opInfo.name === 'INVALID') {
                            throw new exceptions_1.VmError(exceptions_1.ERROR.INVALID_OPCODE);
                        }
                        // Reduce opcode's base fee
                        this._eei.useGas(new BN(opInfo.fee));
                        // Advance program counter
                        this._runState.programCounter++;
                        opFn = this.getOpHandler(opInfo);
                        if (!opInfo.isAsync) return [3 /*break*/, 2];
                        return [4 /*yield*/, opFn.apply(null, [this._runState])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        opFn.apply(null, [this._runState]);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the handler function for an opcode.
     */
    Interpreter.prototype.getOpHandler = function (opInfo) {
        return opFns_1.handlers[opInfo.name];
    };
    /**
     * Get info for an opcode from VM's list of opcodes.
     */
    Interpreter.prototype.lookupOpInfo = function (op, full) {
        if (full === void 0) { full = false; }
        var opcode = this._vm._opcodes[op]
            ? this._vm._opcodes[op]
            : { name: 'INVALID', fee: 0, isAsync: false };
        if (full) {
            var name = opcode.name;
            if (name === 'LOG') {
                name += op - 0xa0;
            }
            if (name === 'PUSH') {
                name += op - 0x5f;
            }
            if (name === 'DUP') {
                name += op - 0x7f;
            }
            if (name === 'SWAP') {
                name += op - 0x8f;
            }
            return __assign(__assign({}, opcode), { name: name });
        }
        return opcode;
    };
    Interpreter.prototype._runStepHook = function () {
        return __awaiter(this, void 0, void 0, function () {
            var eventObj;
            return __generator(this, function (_a) {
                eventObj = {
                    pc: this._runState.programCounter,
                    gasLeft: this._eei.getGasLeft(),
                    opcode: this.lookupOpInfo(this._runState.opCode, true),
                    stack: this._runState.stack._store,
                    depth: this._eei._env.depth,
                    address: this._eei._env.address,
                    account: this._eei._env.contract,
                    stateManager: this._runState.stateManager,
                    memory: this._runState.memory._store,
                    memoryWordCount: this._runState.memoryWordCount,
                    codeAddress: this._eei._env.codeAddress,
                };
                if (process_1.env.DEBUG_OVM === 'true') {
                    try {
                        this.logStep(eventObj);
                    }
                    catch (e) {
                        logger.log("Caught error logging VM step: " + JSON.stringify(e));
                    }
                }
                if (process_1.env.DEBUG_OVM_GAS === 'true') {
                    try {
                        if (this._eei._env.isOvmCall) {
                            logGas_1.default(eventObj, this._vm);
                        }
                    }
                    catch (e) {
                        logger.log("Caught error logging VM step: " + JSON.stringify(e));
                    }
                }
                /**
                 * The `step` event for trace output
                 *
                 * @event Event: step
                 * @type {Object}
                 * @property {Number} pc representing the program counter
                 * @property {String} opcode the next opcode to be ran
                 * @property {BN} gasLeft amount of gasLeft
                 * @property {Array} stack an `Array` of `Buffers` containing the stack
                 * @property {Account} account the [`Account`](https://github.com/ethereum/ethereumjs-account) which owns the code running
                 * @property {Buffer} address the address of the `account`
                 * @property {Number} depth the current number of calls deep the contract is
                 * @property {Buffer} memory the memory of the VM as a `buffer`
                 * @property {BN} memoryWordCount current size of memory in words
                 * @property {StateManager} stateManager a [`StateManager`](stateManager.md) instance (Beta API)
                 */
                return [2 /*return*/, this._vm._emit('step', eventObj)];
            });
        });
    };
    Interpreter.prototype.logStep = function (info) {
        var e_3, _a;
        if (!this._eei._env.isOvmCall) {
            return;
        }
        var opName = info.opcode.name;
        var curAddress = info['address'].toString('hex');
        var curDepth = info['depth'];
        var scope = curAddress.slice(0, 8) + '...:d' + info['depth'];
        if (!this._executionLoggers.has(curDepth)) {
            var addrName = curAddress;
            try {
                for (var _b = __values(Object.keys(this._vm._contracts)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var ovmContract = _c.value;
                    if (!!this._vm._contracts[ovmContract].address) {
                        if (curAddress == this._vm._contracts[ovmContract].address.toString('hex')) {
                            addrName = ovmContract;
                            scope =
                                new Map([
                                    ['AddressResolver', 'addr-rslvr'],
                                    ['StateManager', 'state-mgr'],
                                    ['SafetyChecker', 'safety-chkr'],
                                    ['ExecutionManager', 'exe-mgr'],
                                ]).get(ovmContract) || ovmContract;
                        }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            var descriptionStart = curDepth === 0 ? 'OVM TX. starts with ' : 'EVM STEPS for ';
            var callLogger_1 = logger.scope('evm', descriptionStart + addrName + ' at depth ' + curDepth, scope);
            var stepLogger_1 = new logger_1.Logger(callLogger_1.getNamespace() + ':steps');
            var memLogger_1 = new logger_1.Logger(callLogger_1.getNamespace() + ':memory');
            callLogger_1.open();
            this._executionLoggers.set(curDepth, { callLogger: callLogger_1, stepLogger: stepLogger_1, memLogger: memLogger_1 });
        }
        var callLogger;
        var stepLogger;
        var memLogger;
        var loggers = this._executionLoggers.get(curDepth);
        if (!!loggers) {
            callLogger = loggers.callLogger;
            stepLogger = loggers.stepLogger;
            memLogger = loggers.memLogger;
        }
        if (callLogger === undefined || stepLogger === undefined || memLogger === undefined) {
            return;
        }
        var curMemory = info['memory'];
        var stack;
        if (['RETURN', 'REVERT'].includes(opName)) {
            stack = new (Array.bind.apply(Array, __spread([void 0], info['stack'])))().reverse();
            var offset = stack[0];
            var length = stack[1];
            var returnOrRevertData = Buffer.from(curMemory.slice(offset.toNumber(), offset.toNumber() + length.toNumber()));
            callLogger.log(opName + ' with data: 0x' + returnOrRevertData.toString('hex'));
            callLogger.close();
            this._executionLoggers.delete(curDepth);
            return;
        }
        if (opName == 'CALL') {
            stack = new (Array.bind.apply(Array, __spread([void 0], info['stack'])))().reverse();
            var target = stack[1].toBuffer();
            var argsOffset = stack[3];
            var argsLength = stack[4];
            var calldata = Buffer.from(curMemory.slice(argsOffset.toNumber(), argsOffset.toNumber() + argsLength.toNumber()));
            if (!!this._vm._contracts.ExecutionManager.address) {
                if (target.equals(this._vm._contracts.ExecutionManager.address)) {
                    var _d = this._vm._contracts.ExecutionManager.decodeFunctionData(calldata), functionName = _d.functionName, functionArgs = _d.functionArgs;
                    callLogger.log("CALL to ExecutionManager." + functionName + " with: " + functionArgs + " (raw w/o sighash): 0x" + calldata
                        .slice(4)
                        .toString('hex') + ")");
                }
                else {
                    callLogger.log("CALL to " + target.toString('hex') + " with data: \n0x" + calldata.toString('hex'));
                }
            }
            return;
        }
        var printThisMem = ['CALL', 'CREATE', 'CREATE2', 'STATICCALL', 'DELEGATECALL'].includes(opName) || printNextMem;
        printNextMem = false;
        if (['MSTORE', 'CALLDATACOPY', 'RETUNDATACOPY', 'CODECOPY'].includes(opName)) {
            printNextMem = true;
        }
        if (stack === undefined) {
            stack = new (Array.bind.apply(Array, __spread([void 0], info['stack'])))().reverse();
        }
        stepLogger.log("op:" + padToLengthIfPossible(opName, 9) + "stack:[  " + stack.map(function (stackEl) {
            return '0x' + stackEl.toString('hex');
        }) + "], pc:0x" + info['pc'].toString(6));
        if (printThisMem) {
            memLogger.log("[" + ('0x' + Buffer.from(curMemory).toString('hex')) + "]");
        }
    };
    // Returns all valid jump destinations.
    Interpreter.prototype._getValidJumpDests = function (code) {
        var jumps = [];
        for (var i = 0; i < code.length; i++) {
            var curOpCode = this.lookupOpInfo(code[i]).name;
            // no destinations into the middle of PUSH
            if (curOpCode === 'PUSH') {
                i += code[i] - 0x5f;
            }
            if (curOpCode === 'JUMPDEST') {
                jumps.push(i);
            }
        }
        return jumps;
    };
    return Interpreter;
}());
exports.default = Interpreter;
//# sourceMappingURL=interpreter.js.map