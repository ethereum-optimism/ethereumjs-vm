"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOvmTransaction = void 0;
/* External Imports */
var ethereumjs_tx_1 = require("ethereumjs-tx");
exports.sendOvmTransaction = function (vm, calldata, from, to) {
    // TODO: Make sure these constants are configurable.
    var tx = new ethereumjs_tx_1.Transaction({
        nonce: 0,
        gasPrice: 0,
        gasLimit: vm._emGasLimit,
        to: to,
        data: calldata,
    });
    tx['_from'] = from;
    return vm.runTx({
        tx: tx,
        skipBalance: true,
        skipNonce: true,
        skipExecutionManager: true,
    });
};
//# sourceMappingURL=ovm-transaction.js.map