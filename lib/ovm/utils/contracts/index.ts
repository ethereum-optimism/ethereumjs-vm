/* External Imports */
import { Interface } from '@ethersproject/abi'

/* Internal Imports */
import VM from '../../../index'
import { OVMContract } from '../ovm-contract'
import {
  AddressResolverDef,
  ExecutionManagerDef,
  FullStateManagerDef,
  StubSafetyCheckerDef,
} from './defs'

interface OVMContractDef {
  iface: Interface
  bytecode: string
}

const makeOvmContractDef = (def: any): OVMContractDef => {
  return {
    iface: new Interface(def.abi),
    bytecode: def.bytecode,
  }
}

export const OVM_CONTRACT_DEFS: any = {
  AddressResolver: makeOvmContractDef(AddressResolverDef),
  ExecutionManager: makeOvmContractDef(ExecutionManagerDef),
  StateManager: makeOvmContractDef(FullStateManagerDef),
  SafetyChecker: makeOvmContractDef(StubSafetyCheckerDef),
}

export const makeOvmContract = (vm: VM, name: string): OVMContract => {
  const def = OVM_CONTRACT_DEFS[name]
  return new OVMContract({
    vm: vm,
    iface: def.iface,
    name: name,
    bytecode: def.bytecode,
  })
}
