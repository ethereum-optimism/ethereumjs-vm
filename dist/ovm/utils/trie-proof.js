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
exports.getEthTrieProof = void 0;
/* External Imports */
var keccak256_1 = require("@ethersproject/keccak256");
/* Internal Imports */
var buffer_utils_1 = require("./buffer-utils");
/**
 * Callback wrapper; returns a Merkle proof for an element within a trie.
 * @param trie Trie to generate the proof from.
 * @param key Key to prove existance of.
 * @param cb Callback for the returned value.
 */
var getTrieProofCb = function (trie, key, cb) {
    var nodes = [];
    // tslint:disable-next-line:only-arrow-functions
    trie.findPath(key, function (err, node, remaining, stack) {
        if (err) {
            return cb(err);
        }
        if (remaining.length > 0) {
            return cb(new Error('Node does not contain the key'));
        }
        nodes = stack;
        var p = [];
        for (var i = 0; i < nodes.length; i++) {
            var rlpNode = nodes[i].serialize();
            if (rlpNode.length >= 32 || i === 0) {
                p.push(rlpNode);
            }
        }
        cb(null, p);
    });
};
/**
 * Returns a Merkle proof for an element within a trie.
 * @param trie Trie to generate the proof from.
 * @param key Key to prove existance of.
 * @returns Merkle proof for the provided element.
 */
var getTrieProof = function (trie, key) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Some implementations use secure tries (hashed keys) but others don't.
        // Circumvent this by trying twice, once unhashed and once hashed.
        return [2 /*return*/, new Promise(function (resolve, reject) {
                // tslint:disable-next-line:only-arrow-functions
                getTrieProofCb(trie, key, function (err, proof) {
                    if (err) {
                        key = buffer_utils_1.fromHexString(keccak256_1.keccak256(buffer_utils_1.toHexString(key)));
                        getTrieProofCb(trie, key, function (err, proof) {
                            if (err) {
                                reject(err);
                            }
                            resolve(proof);
                        });
                    }
                    else {
                        resolve(proof);
                    }
                });
            })];
    });
}); };
/**
 * Returns the value for a given key in a trie.
 * @param trie Trie to get the value from.
 * @param key Key to get a value for.
 * @returns Value for the provided key.
 */
var getKeyValue = function (trie, key) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, reject) {
                trie.get(key, function (err, value) {
                    if (err) {
                        reject(err);
                    }
                    resolve(value);
                });
            })];
    });
}); };
/**
 * Returns a trie proof in the format of EIP-1186.
 * @param vm VM to generate the proof from.
 * @param address Address to generate the proof for.
 * @param slots Slots to get proofs for.
 * @returns A proof object in the format of EIP-1186.
 */
exports.getEthTrieProof = function (vm, address, slots) {
    if (slots === void 0) { slots = []; }
    return __awaiter(void 0, void 0, void 0, function () {
        var stateTrie, account, accountProof, storageTrie, storageProof, slots_1, slots_1_1, slot, value, proof, e_1_1;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    stateTrie = vm.stateManager._trie;
                    return [4 /*yield*/, vm.pStateManager.getAccount(address)];
                case 1:
                    account = _b.sent();
                    return [4 /*yield*/, getTrieProof(stateTrie, address)
                        // Generate storage proofs for each of the requested slots.
                    ];
                case 2:
                    accountProof = _b.sent();
                    return [4 /*yield*/, vm.pStateManager._getStorageTrie(address)];
                case 3:
                    storageTrie = _b.sent();
                    storageProof = [];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 10, 11, 12]);
                    slots_1 = __values(slots), slots_1_1 = slots_1.next();
                    _b.label = 5;
                case 5:
                    if (!!slots_1_1.done) return [3 /*break*/, 9];
                    slot = slots_1_1.value;
                    return [4 /*yield*/, getKeyValue(storageTrie, slot)];
                case 6:
                    value = _b.sent();
                    return [4 /*yield*/, getTrieProof(storageTrie, slot)];
                case 7:
                    proof = _b.sent();
                    storageProof.push({
                        key: buffer_utils_1.toHexString(slot),
                        value: buffer_utils_1.toHexString(value),
                        proof: proof.map(function (el) {
                            return buffer_utils_1.toHexString(el);
                        }),
                    });
                    _b.label = 8;
                case 8:
                    slots_1_1 = slots_1.next();
                    return [3 /*break*/, 5];
                case 9: return [3 /*break*/, 12];
                case 10:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 12];
                case 11:
                    try {
                        if (slots_1_1 && !slots_1_1.done && (_a = slots_1.return)) _a.call(slots_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/, {
                        balance: account.balance.length ? buffer_utils_1.toHexString(account.balance) : '0x0',
                        nonce: account.nonce.length ? buffer_utils_1.toHexString(account.nonce) : '0x0',
                        storageHash: buffer_utils_1.toHexString(account.stateRoot),
                        codeHash: buffer_utils_1.toHexString(account.codeHash),
                        stateRoot: buffer_utils_1.toHexString(stateTrie.root),
                        accountProof: accountProof.map(function (el) {
                            return buffer_utils_1.toHexString(el);
                        }),
                        storageProof: storageProof,
                    }];
            }
        });
    });
};
//# sourceMappingURL=trie-proof.js.map