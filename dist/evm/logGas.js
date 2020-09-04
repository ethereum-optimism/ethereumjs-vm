"use strict";
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
var logger_1 = require("../ovm/utils/logger");
var logger = new logger_1.Logger('ethjs-ovm');
var gasOpts = {
    insideTx: false,
    startGas: 0,
    prevGasLeft: 0,
    prevDepth: 0,
    curDomain: '',
    tracking: {}
};
function logGas(info, _vm) {
    var e_1, _a;
    var opName = info.opcode.name;
    var curAddress = info['address'].toString('hex');
    try {
        for (var _b = __values(Object.keys(_vm._contracts)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var ovmContract = _c.value;
            if (!!_vm._contracts[ovmContract].address) {
                if (curAddress == _vm._contracts[ovmContract].address.toString('hex')) {
                    curAddress = ovmContract;
                }
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
    var curDepth = info['depth'];
    // start keeping track of gas! start of tx
    if (curDepth === 0 && !gasOpts.insideTx) {
        console.log('STARTING A TX!', curAddress);
        gasOpts.insideTx = true;
        gasOpts.startGas = info.gasLeft.toNumber();
        gasOpts.curDomain = curAddress;
        gasOpts.prevDepth = curDepth;
    }
    if (curDepth !== gasOpts.prevDepth) {
        var gasConsumed = gasOpts.startGas - gasOpts.prevGasLeft;
        console.log(gasOpts.curDomain, 'at', gasOpts.prevDepth, '->', curAddress, 'at', curDepth, '- Used', gasConsumed, 'gas');
        // track gas used in previous depth
        if (!!gasOpts.tracking[gasOpts.curDomain]) {
            gasOpts.tracking[gasOpts.curDomain] += gasConsumed;
        }
        else {
            gasOpts.tracking[gasOpts.curDomain] = gasConsumed;
        }
        //get name of new current domain address
        gasOpts.startGas = info.gasLeft.toNumber();
        gasOpts.curDomain = curAddress;
        gasOpts.prevDepth = curDepth;
    }
    gasOpts.prevGasLeft = info.gasLeft.toNumber();
    if (['RETURN', 'REVERT', 'STOP', 'INVALID'].includes(opName)) {
        // end of tx, log the gasUsed 
        if (curDepth === 0) {
            gasOpts.insideTx = false;
            console.log('Finished tx!', gasOpts.tracking);
        }
    }
}
exports.default = logGas;
//# sourceMappingURL=logGas.js.map