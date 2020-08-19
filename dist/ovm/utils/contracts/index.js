"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeOvmContract = exports.OVM_CONTRACT_DEFS = void 0;
/* External Imports */
var abi_1 = require("@ethersproject/abi");
var ovm_contract_1 = require("../ovm-contract");
var defs_1 = require("./defs");
var makeOvmContractDef = function (def) {
    return {
        iface: new abi_1.Interface(def.abi),
        bytecode: def.bytecode,
    };
};
exports.OVM_CONTRACT_DEFS = {
    AddressResolver: makeOvmContractDef(defs_1.AddressResolverDef),
    ExecutionManager: makeOvmContractDef(defs_1.ExecutionManagerDef),
    StateManager: makeOvmContractDef(defs_1.FullStateManagerDef),
    SafetyChecker: makeOvmContractDef(defs_1.StubSafetyCheckerDef),
};
exports.makeOvmContract = function (vm, name) {
    var def = exports.OVM_CONTRACT_DEFS[name];
    return new ovm_contract_1.OVMContract({
        vm: vm,
        iface: def.iface,
        name: name,
        bytecode: def.bytecode,
    });
};
//# sourceMappingURL=index.js.map