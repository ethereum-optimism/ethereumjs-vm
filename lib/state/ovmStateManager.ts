// const Set = require('core-js-pure/es/set')
// const Trie = require('merkle-patricia-tree/secure.js')
// const asyncLib = require('async')
// import * as utils from 'ethereumjs-util'
// import BN = require('bn.js')
// import { encode, decode } from 'rlp'
// import Common from 'ethereumjs-common'
// import { genesisStateByName } from 'ethereumjs-common/dist/genesisStates'
// import Account from 'ethereumjs-account'
// import Cache from './cache'
// import { ripemdPrecompileAddress } from '../evm/precompiles'
import { keccak256 } from 'ethereumjs-util'
import PStateManager from './promisified'

/**
 * OVM Interface for getting and setting state
 * from the Execution Manager.
 */
export default class OVMStateManagerWrapper {
  sm: PStateManager
  address: string = '0x' + '12'.repeat(20)
  //TODO Create a type for this
  stateManagerFunctionAndGasCost: any = {
    'getStorage(address,bytes32)': {
      smFunction: this.getStorage,
      smGasCost: 20000,
    },
    // "setStorage(address,bytes32,bytes32)": {
    //   smFunction: this.setStorage,
    //   smGasCost:  20000,
    // },
    // "getOvmContractNonce(address)": {
    //   smFunction: this.getOvmContractNonce,
    //   smGasCost:  20000,
    // },
    // "incrementOvmContractNonce(address)": {
    //   smFunction: this.incrementOvmContractNonce,
    //   smGasCost:  20000,
    // },
    // "getCodeContractBytecode(address)": {
    //   smFunction: this.getCodeContractBytecode,
    //   smGasCost:  20000,
    // },
    // "getCodeContractHash(address)": {
    //   smFunction: this.getCodeContractHash,
    //   smGasCost:  20000,
    // },
    // "getCodeContractAddressFromOvmAddress(address)": {
    //   smFunction: this.getCodeContractAddress,
    //   smGasCost:  20000,
    // },
    // "associateCodeContract(address,address)": {
    //   smFunction: this.associateCodeContract,
    //   smGasCost:  20000,
    // },
    // "registerCreatedContract(address)": {
    //   smFunction: this.registerCreatedContract,
    //   smGasCost:  20000,
    // },
  }
  methodIds: any = {}

  /**
   * Instantiate the StateManager interface.
   */
  constructor(sm: PStateManager) {
    this.sm = sm
    // Map methodID to function and gas cost
    for (const [methodSignature, functionAndGasCost] of Object.entries(
      this.stateManagerFunctionAndGasCost,
    )) {
      this.methodIds[this.methodSignatureToMethodID(methodSignature)] = functionAndGasCost
    }
  }

  methodSignatureToMethodID(methodSignature: string): string {
    const hash = keccak256(methodSignature)
    return `0x${hash.toString('hex').substring(0, 8)}`
  }

  // func stateManagerRequiredGas(input []byte) (gas uint64) {
  //   var methodID [4]byte
  //   copy(methodID[:], input[:4])
  //   gas = methodIds[methodID].smGasCost
  //   return gas
  // }

  // func callStateManager(input []byte, evm *EVM, contract *Contract) (ret []byte, err error) {
  //   var methodID [4]byte
  //   copy(methodID[:], input[:4])
  //   ret, err = methodIds[methodID].smFunction(evm, contract, input)
  //   return ret, err
  // }

  async callSMFunction(data:string) {
    const methodId = data.substring(0, 8)
    const input = data.substring(8)
    const ret = await this.methodIds[methodId].smFunction(input)
    return ret
  }

  /*
   * StateManager functions
   */

  setStorage(input: string, cb: any): void {
    
    // this.putContractStorage(Buffer.from(address, 'hex'), Buffer.from(key, 'hex'),  Buffer.from(value, 'hex'), cb)
  }

  async getStorage(input: string) {
    console.log('getting storage')

    // this.getContractStorage(Buffer.from(address, 'hex'), Buffer.from(key, 'hex'), cb)
    // address := common.BytesToAddress(input[4:36])
    // key := common.BytesToHash(input[36:68])
    // val := evm.StateDB.GetState(address, key)
    // log.Debug("[State Mgr] Getting storage.", "Contract address:", hex.EncodeToString(address.Bytes()), "key:", hex.EncodeToString(key.Bytes()), "val:", hex.EncodeToString(val.Bytes()))
    // return val.Bytes(), nil
  }

  // func getCodeContractBytecode(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   address := common.BytesToAddress(input[4:36])
  //   code := evm.StateDB.GetCode(address)
  //   log.Debug("[State Mgr] Getting Bytecode.", " Contract address:", hex.EncodeToString(address.Bytes()), "Code:", hex.EncodeToString(code))
  //   return simpleAbiEncode(code), nil
  // }

  // func getCodeContractHash(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   address := common.BytesToAddress(input[4:36])
  //   codeHash := evm.StateDB.GetCodeHash(address)
  //   log.Debug("[State Mgr] Getting Code Hash.", " Contract address:", hex.EncodeToString(address.Bytes()), "Code hash:", hex.EncodeToString(codeHash.Bytes()))
  //   return codeHash.Bytes(), nil
  // }

  // func associateCodeContract(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   log.Debug("[State Mgr] Associating code contract")
  //   return []byte{}, nil
  // }

  // func registerCreatedContract(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   log.Debug("[State Mgr] Registering created contract")
  //   return []byte{}, nil
  // }

  // func getCodeContractAddress(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   address := input[4:36]
  //   // Ensure 0x0000...deadXXXX is not called as they are banned addresses (the address space used for the OVM contracts)
  //   bannedAddresses := []byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 222, 173}
  //   if bytes.Equal(input[16:34], bannedAddresses) {
  //     log.Error("[State Mgr] forbidden 0x...DEAD address access!", "Address", hex.EncodeToString(address))
  //     return nil, errors.New("forbidden 0x...DEAD address access")
  //   }
  //   log.Debug("[State Mgr] Getting code contract.", "address:", hex.EncodeToString(address))
  //   return address, nil
  // }

  // func getOvmContractNonce(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   address := common.BytesToAddress(input[4:36])
  //   b := make([]byte, 8)
  //   binary.BigEndian.PutUint64(b, evm.StateDB.GetNonce(address))
  //   val := append(make([]byte, 24), b[:]...)
  //   log.Debug("[State Mgr] Getting nonce.", "Contract address:", hex.EncodeToString(address.Bytes()), "Nonce:", evm.StateDB.GetNonce(address))
  //   return val, nil
  // }

  // func incrementOvmContractNonce(evm *EVM, contract *Contract, input []byte) (ret []byte, err error) {
  //   address := common.BytesToAddress(input[4:36])
  //   oldNonce := evm.StateDB.GetNonce(address)
  //   evm.StateDB.SetNonce(address, oldNonce+1)
  //   log.Debug("[State Mgr] Incrementing nonce.", " Contract address:", hex.EncodeToString(address.Bytes()), "Nonce:", oldNonce+1)
  //   return nil, nil
  // }

  // func simpleAbiEncode(bytes []byte) []byte {
  //   encodedCode := make([]byte, WORD_SIZE)
  //   binary.BigEndian.PutUint64(encodedCode[WORD_SIZE-8:], uint64(len(bytes)))
  //   padding := make([]byte, len(bytes)%WORD_SIZE)
  //   codeWithLength := append(append(encodedCode, bytes...), padding...)
  //   offset := make([]byte, WORD_SIZE)
  //   // Hardcode a 2 because we will only return dynamic bytes with a single element
  //   binary.BigEndian.PutUint64(offset[WORD_SIZE-8:], uint64(2))
  //   return append([]byte{0, 0}, append(offset, codeWithLength...)...)
  // }
}
