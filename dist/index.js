"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
var BN = require("bn.js");
var ethereumjs_account_1 = require("ethereumjs-account");
var ethereumjs_blockchain_1 = require("ethereumjs-blockchain");
var ethereumjs_common_1 = require("ethereumjs-common");
var state_1 = require("./state");
var runCode_1 = require("./runCode");
var runCall_1 = require("./runCall");
var runTx_1 = require("./runTx");
var runBlock_1 = require("./runBlock");
var opcodes_1 = require("./evm/opcodes");
var runBlockchain_1 = require("./runBlockchain");
var promisified_1 = require("./state/promisified");
var ovm_state_manager_1 = require("./ovm/utils/ovm-state-manager");
var contracts_1 = require("./ovm/utils/contracts");
var logger_1 = require("./ovm/utils/logger");
var constants_1 = require("./ovm/utils/constants");
var buffer_utils_1 = require("./ovm/utils/buffer-utils");
var trie_proof_1 = require("./ovm/utils/trie-proof");
var promisify = require('util.promisify');
var AsyncEventEmitter = require('async-eventemitter');
var Trie = require('merkle-patricia-tree/secure.js');
var logger = new logger_1.Logger('ethereumjs-ovm:vm-wrapper');
var sleep = function (ms) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve) {
                setTimeout(function () {
                    resolve();
                }, ms);
            })];
    });
}); };
/**
 * Execution engine which can be used to run a blockchain, individual
 * blocks, individual transactions, or snippets of EVM bytecode.
 *
 * This class is an AsyncEventEmitter, please consult the README to learn how to use it.
 */
var VM = /** @class */ (function (_super) {
    __extends(VM, _super);
    /**
     * Instantiates a new [[VM]] Object.
     * @param opts - Default values for the options are:
     *  - `chain`: 'mainnet'
     *  - `hardfork`: 'petersburg' [supported: 'byzantium', 'constantinople', 'petersburg', 'istanbul' (DRAFT) (will throw on unsupported)]
     *  - `activatePrecompiles`: false
     *  - `allowUnlimitedContractSize`: false [ONLY set to `true` during debugging]
     */
    function VM(opts) {
        if (opts === void 0) { opts = {}; }
        var _this = _super.call(this) || this;
        _this._contracts = {};
        _this.opts = opts;
        if (opts.common) {
            if (opts.chain || opts.hardfork) {
                throw new Error('You can only instantiate the VM class with one of: opts.common, or opts.chain and opts.hardfork');
            }
            _this._common = opts.common;
        }
        else {
            var chain = opts.chain ? opts.chain : 'mainnet';
            var hardfork = opts.hardfork ? opts.hardfork : 'petersburg';
            var supportedHardforks = [
                'byzantium',
                'constantinople',
                'petersburg',
                'istanbul',
                'muirGlacier',
            ];
            _this._common = new ethereumjs_common_1.default(chain, hardfork, supportedHardforks);
        }
        // Set list of opcodes based on HF
        _this._opcodes = opcodes_1.getOpcodesForHF(_this._common);
        if (opts.stateManager) {
            _this.stateManager = opts.stateManager;
        }
        else {
            var trie = opts.state || new Trie();
            if (opts.activatePrecompiles) {
                for (var i = 1; i <= 8; i++) {
                    trie.put(new BN(i).toArrayLike(Buffer, 'be', 20), new ethereumjs_account_1.default().serialize());
                }
            }
            _this.stateManager = new state_1.StateManager({ trie: trie, common: _this._common });
        }
        _this.pStateManager = new promisified_1.default(_this.stateManager);
        _this.blockchain = opts.blockchain || new ethereumjs_blockchain_1.default({ common: _this._common });
        _this.allowUnlimitedContractSize =
            opts.allowUnlimitedContractSize === undefined ? false : opts.allowUnlimitedContractSize;
        // We cache this promisified function as it's called from the main execution loop, and
        // promisifying each time has a huge performance impact.
        _this._emit = promisify(_this.emit.bind(_this));
        // TODO: Add comments here
        logger.log('Setting up OVM contract objects');
        _this._emGasLimit = opts.emGasLimit || 100000000;
        _this._initialized = opts.initialized || false;
        _this._ovmStateManager = new ovm_state_manager_1.OvmStateManager({ vm: _this });
        if (opts.contracts) {
            _this._contracts = opts.contracts;
        }
        else {
            _this._contracts.AddressResolver = contracts_1.makeOvmContract(_this, 'AddressResolver');
            _this._contracts.ExecutionManager = contracts_1.makeOvmContract(_this, 'ExecutionManager');
            _this._contracts.StateManager = contracts_1.makeOvmContract(_this, 'StateManager');
            _this._contracts.SafetyChecker = contracts_1.makeOvmContract(_this, 'SafetyChecker');
        }
        return _this;
    }
    VM.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._initialized) {
                            return [2 /*return*/];
                        }
                        this._initialized = true;
                        logger.log('Running OVM initialization logic');
                        return [4 /*yield*/, sleep(1000)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 10, , 11]);
                        // Contract deployment
                        logger.log("Deploying OVM contracts:");
                        logger.log("Deploying AddressResolver...");
                        return [4 /*yield*/, this._contracts.AddressResolver.deploy()];
                    case 3:
                        _a.sent();
                        logger.log("Deployed AddressResolver at: " + this._contracts.AddressResolver.addressHex);
                        logger.log("Deploying StateManager...");
                        return [4 /*yield*/, this._contracts.StateManager.deploy()];
                    case 4:
                        _a.sent();
                        logger.log("Deployed StateManager at: " + this._contracts.StateManager.addressHex);
                        logger.log("Connecting StateManager to AddressResolver...");
                        return [4 /*yield*/, this._contracts.AddressResolver.sendTransaction('setAddress', [
                                'StateManager',
                                this._contracts.StateManager.addressHex,
                            ])];
                    case 5:
                        _a.sent();
                        logger.log("Connected StateManager to AddressResolver.");
                        logger.log("Deploying SafetyChecker...");
                        return [4 /*yield*/, this._contracts.SafetyChecker.deploy()];
                    case 6:
                        _a.sent();
                        logger.log("Deployed SafetyChecker at: " + this._contracts.SafetyChecker.addressHex);
                        logger.log("Connecting SafetyChecker to AddressResolver...");
                        return [4 /*yield*/, this._contracts.AddressResolver.sendTransaction('setAddress', [
                                'SafetyChecker',
                                this._contracts.SafetyChecker.addressHex,
                            ])];
                    case 7:
                        _a.sent();
                        logger.log("Connected SafetyChecker to AddressResolver.");
                        logger.log("Deploying ExecutionManager...");
                        return [4 /*yield*/, this._contracts.ExecutionManager.deploy([
                                this._contracts.AddressResolver.addressHex,
                                constants_1.NULL_ADDRESS,
                                {
                                    OvmTxBaseGasFee: 0,
                                    OvmTxMaxGas: this._emGasLimit,
                                    GasRateLimitEpochSeconds: 0,
                                    MaxSequencedGasPerEpoch: this._emGasLimit,
                                    MaxQueuedGasPerEpoch: this._emGasLimit,
                                },
                            ])];
                    case 8:
                        _a.sent();
                        logger.log("Deployed ExecutionManager at: " + this._contracts.ExecutionManager.addressHex);
                        logger.log("Connecting ExecutionManager to AddressResolver...");
                        return [4 /*yield*/, this._contracts.AddressResolver.sendTransaction('setAddress', [
                                'ExecutionManager',
                                this._contracts.ExecutionManager.addressHex,
                            ])];
                    case 9:
                        _a.sent();
                        logger.log("Connected ExecutionManager to AddressResolver.");
                        return [3 /*break*/, 11];
                    case 10:
                        err_1 = _a.sent();
                        this._initialized = false;
                        throw err_1;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Processes blocks and adds them to the blockchain.
     *
     * This method modifies the state.
     *
     * @param blockchain -  A [blockchain](https://github.com/ethereum/ethereumjs-blockchain) object to process
     */
    VM.prototype.runBlockchain = function (blockchain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, runBlockchain_1.default.bind(this)(blockchain)];
                }
            });
        });
    };
    /**
     * Processes the `block` running all of the transactions it contains and updating the miner's account
     *
     * This method modifies the state. If `generate` is `true`, the state modifications will be
     * reverted if an exception is raised. If it's `false`, it won't revert if the block's header is
     * invalid. If an error is thrown from an event handler, the state may or may not be reverted.
     *
     * @param opts - Default values for options:
     *  - `generate`: false
     */
    VM.prototype.runBlock = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, runBlock_1.default.bind(this)(opts)];
                }
            });
        });
    };
    /**
     * Process a transaction. Run the vm. Transfers eth. Checks balances.
     *
     * This method modifies the state. If an error is thrown, the modifications are reverted, except
     * when the error is thrown from an event handler. In the latter case the state may or may not be
     * reverted.
     */
    VM.prototype.runTx = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, runTx_1.default.bind(this)(opts)];
                }
            });
        });
    };
    /**
     * runs a call (or create) operation.
     *
     * This method modifies the state.
     */
    VM.prototype.runCall = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, runCall_1.default.bind(this)(opts)];
                }
            });
        });
    };
    /**
     * Runs EVM code.
     *
     * This method modifies the state.
     */
    VM.prototype.runCode = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, runCode_1.default.bind(this)(opts)];
                }
            });
        });
    };
    /**
     * Returns a copy of the [[VM]] instance.
     */
    VM.prototype.copy = function () {
        return new VM({
            stateManager: this.stateManager.copy(),
            blockchain: this.blockchain,
            common: this._common,
            initialized: this._initialized,
            contracts: this._contracts,
        });
    };
    /**
     * Utility; returns the name of a contract if known.
     * @param address Address of the contract to name.
     * @returns Known contract name.
     */
    VM.prototype.getContractName = function (address) {
        var e_1, _a;
        try {
            for (var _b = __values(Object.values(this._contracts)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var contract = _c.value;
                if (contract.address && buffer_utils_1.toHexString(address) === contract.addressHex) {
                    return contract.name;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return 'Unknown Contract';
    };
    /**
     * Handler for the `eth_getProof` custom RPC method.
     * @param address Address to get a proof for.
     * @param slots Slots to get proofs for, optionally.
     * @returns Proof object for the provided inputs.
     */
    VM.prototype.getEthTrieProof = function (address, slots) {
        if (slots === void 0) { slots = []; }
        return __awaiter(this, void 0, void 0, function () {
            var addressBuf, slotsBuf;
            return __generator(this, function (_a) {
                addressBuf = typeof address === 'string' ? buffer_utils_1.fromHexString(address) : address;
                slotsBuf = slots.map(function (slot) {
                    return typeof slot === 'string' ? buffer_utils_1.fromHexString(slot) : slot;
                });
                return [2 /*return*/, trie_proof_1.getEthTrieProof(this, addressBuf, slotsBuf)];
            });
        });
    };
    /**
     * Handler for the `eth_getAccount` custom RPC method.
     * @param address Address to get an account for.
     * @returns Account object for the address.
     */
    VM.prototype.getEthAccount = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var addressBuf, account;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        addressBuf = typeof address === 'string' ? buffer_utils_1.fromHexString(address) : address;
                        return [4 /*yield*/, this.pStateManager.getAccount(addressBuf)];
                    case 1:
                        account = _a.sent();
                        return [2 /*return*/, {
                                balance: buffer_utils_1.toHexString(account.balance),
                                nonce: buffer_utils_1.toHexString(account.nonce),
                                storageHash: buffer_utils_1.toHexString(account.stateRoot),
                                codeHash: buffer_utils_1.toHexString(account.codeHash),
                            }];
                }
            });
        });
    };
    return VM;
}(AsyncEventEmitter));
exports.default = VM;
//# sourceMappingURL=index.js.map