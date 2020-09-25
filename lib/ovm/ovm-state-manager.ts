/* External Imports */
import BN = require('bn.js')

/* Internal Imports */
import VM from '../index'
import Message from '../evm/message'
import { fromHexString, toHexString } from './utils/buffer-utils'
import { NULL_BYTES32 } from './utils/constants'
import { iStateManager } from './contracts'

export interface OvmStateManagerOpts {
  vm: VM
}

export class OvmStateManager {
  public vm: VM
  private _iface = iStateManager
  private _handlers: {
    [name: string]: any
  }

  constructor(opts: OvmStateManagerOpts) {
    this.vm = opts.vm

    this._handlers = {
      associateCodeContract: this.associateCodeContract.bind(this),
      setStorage: this.setStorage.bind(this),
      getStorage: this.getStorage.bind(this),
      getStorageView: this.getStorageView.bind(this),
      getOvmContractNonce: this.getOvmContractNonce.bind(this),
      getCodeContractBytecode: this.getCodeContractBytecode.bind(this),
      registerCreatedContract: this.registerCreatedContract.bind(this),
      incrementOvmContractNonce: this.incrementOvmContractNonce.bind(this),
      getCodeContractAddressFromOvmAddress: this.getCodeContractAddressFromOvmAddress.bind(this),
    }
  }

  async handleCall(message: Message): Promise<any> {
    const methodId = '0x' + message.data.slice(0, 4).toString('hex')
    const fragment = this._iface.getFunction(methodId)
    const functionArgs = this._iface.decodeFunctionData(fragment, toHexString(message.data))

    const ret = await this._handlers[fragment.name](...functionArgs)
    const encodedRet = this._iface.encodeFunctionResult(fragment, ret)

    return fromHexString(encodedRet)
  }

  async associateCodeContract(
    ovmContractAddress: string,
    codeContractAddress: string,
  ): Promise<void> {
    return
  }

  async setStorage(ovmContractAddress: string, slot: string, value: string): Promise<void> {
    return this.vm.pStateManager.putContractStorage(
      fromHexString(ovmContractAddress),
      fromHexString(slot),
      fromHexString(value),
    )
  }

  async getStorage(ovmContractAddress: string, slot: string): Promise<[string]> {
    return this.getStorageView(ovmContractAddress, slot)
  }

  async getStorageView(ovmContractAddress: string, slot: string): Promise<[string]> {
    const ret = await this.vm.pStateManager.getContractStorage(
      fromHexString(ovmContractAddress),
      fromHexString(slot),
    )

    return [ret.length ? toHexString(ret) : NULL_BYTES32]
  }

  async getOvmContractNonce(ovmContractAddress: string): Promise<[string]> {
    const account = await this.vm.pStateManager.getAccount(fromHexString(ovmContractAddress))
    return [account.nonce.length ? toHexString(account.nonce) : '0x00']
  }

  async getCodeContractBytecode(ovmContractAddress: string): Promise<[string]> {
    const code = await this.vm.pStateManager.getContractCode(fromHexString(ovmContractAddress))
    return [toHexString(code)]
  }

  async registerCreatedContract(ovmContractAddress: string): Promise<void> {
    return
  }

  async incrementOvmContractNonce(ovmContractAddress: string): Promise<void> {
    const account = await this.vm.pStateManager.getAccount(fromHexString(ovmContractAddress))
    account.nonce = new BN(account.nonce).addn(1).toArrayLike(Buffer)
    return this.vm.pStateManager.putAccount(fromHexString(ovmContractAddress), account)
  }

  async getCodeContractAddressFromOvmAddress(ovmContractAddress: string): Promise<[string]> {
    return [ovmContractAddress]
  }
}
