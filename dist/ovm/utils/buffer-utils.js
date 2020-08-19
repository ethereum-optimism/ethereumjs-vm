"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAddressBuf = exports.fromHexString = exports.toHexString = exports.toHexAddress = void 0;
var BN = require('bn.js');
exports.toHexAddress = function (buf) {
    return '0x' + buf.toString('hex').padStart(40, '0');
};
exports.toHexString = function (buf) {
    return '0x' + buf.toString('hex');
};
exports.fromHexString = function (str) {
    return Buffer.from(str.slice(2), 'hex');
};
exports.toAddressBuf = function (address) {
    return typeof address === 'string' ? exports.fromHexString(address) : address;
};
//# sourceMappingURL=buffer-utils.js.map