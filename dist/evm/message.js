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
Object.defineProperty(exports, "__esModule", { value: true });
var BN = require("bn.js");
var buffer_utils_1 = require("../ovm/utils/buffer-utils");
var constants_1 = require("../ovm/utils/constants");
var Message = /** @class */ (function () {
    function Message(opts) {
        this.to = opts.to;
        this.value = opts.value ? new BN(opts.value) : new BN(0);
        this.caller = opts.caller;
        this.gasLimit = opts.gasLimit;
        this.data = opts.data || Buffer.alloc(0);
        this.depth = opts.depth || 0;
        this.code = opts.code;
        this._codeAddress = opts.codeAddress;
        this.isStatic = opts.isStatic || false;
        this.isCompiled = opts.isCompiled || false; // For CALLCODE, TODO: Move from here
        this.salt = opts.salt; // For CREATE2, TODO: Move from here
        this.selfdestruct = opts.selfdestruct; // TODO: Move from here
        this.delegatecall = opts.delegatecall || false;
        // TODO: Add comments here
        this.skipExecutionManager = opts.skipExecutionManager || false;
        this.originalTargetAddress = opts.originalTargetAddress;
    }
    Object.defineProperty(Message.prototype, "codeAddress", {
        get: function () {
            return this._codeAddress ? this._codeAddress : this.to;
        },
        enumerable: false,
        configurable: true
    });
    Message.prototype.isTargetMessage = function () {
        return ((!this.to && !this.originalTargetAddress) ||
            (this.to && this.originalTargetAddress && this.to.equals(this.originalTargetAddress)));
    };
    Message.prototype.isOvmEntryMessage = function () {
        return this.depth === 0 && !this.skipExecutionManager;
    };
    Message.prototype.toOvmMessage = function (vm, block) {
        if (!vm._contracts.ExecutionManager.address) {
            throw new Error('Cannot create a message because the ExecutionManager does not exist.');
        }
        var calldata = vm._contracts.ExecutionManager.iface.encodeFunctionData('executeTransaction', [
            buffer_utils_1.toHexString(new BN(block.header.timestamp).toBuffer()),
            0,
            this.to ? buffer_utils_1.toHexString(this.to) : constants_1.NULL_ADDRESS,
            this.data,
            buffer_utils_1.toHexString(this.caller),
            buffer_utils_1.toHexString(this.caller),
            buffer_utils_1.toHexString(new BN(vm._emGasLimit).toBuffer()),
            true,
        ]);
        return new Message(__assign(__assign({}, this), {
            to: vm._contracts.ExecutionManager.address,
            data: buffer_utils_1.fromHexString(calldata),
            originalTargetAddress: this.to,
        }));
    };
    return Message;
}());
exports.default = Message;
//# sourceMappingURL=message.js.map