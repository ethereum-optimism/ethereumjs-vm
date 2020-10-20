/* External Imports */
import BN = require('bn.js')
import { BigNumber } from 'ethers'

/* Internal Imports */
import VM from '../index'
import Message from '../evm/message'
import { fromHexString, toHexString } from './utils/buffer-utils'
import { NULL_BYTES32 } from './utils/constants'

export interface OvmStateManagerOpts {
  vm: VM
}

export class OvmStateManager {
  public vm: VM
  private _iface: any
  private _handlers: {
    [name: string]: any
  }

  constructor(opts: OvmStateManagerOpts) {
    this.vm = opts.vm
    this._iface = this.vm.contracts.OVM_StateManager.iface

    this._handlers = {
      hasAccount: this.hasAccount.bind(this),
      hasEmptyAccount: this.hasEmptyAccount.bind(this),
      setAccountNonce: this.setAccountNonce.bind(this),
      getAccountNonce: this.getAccountNonce.bind(this),
      getAccountEthAddress: this.getAccountEthAddress.bind(this),
      getContractStorage: this.getContractStorage.bind(this),
      hasContractStorage: this.hasContractStorage.bind(this),
      putContractStorage: this.putContractStorage.bind(this),
      testAndSetAccountLoaded: this.testAndSetAccountLoaded.bind(this),
      testAndSetAccountChanged: this.testAndSetAccountChanged.bind(this),
      testAndSetContractStorageLoaded: this.testAndSetContractStorageLoaded.bind(this),
      testAndSetContractStorageChanged: this.testAndSetContractStorageChanged.bind(this),
    }
  }

  async handleCall(message: Message, context: any): Promise<any> {
    const methodId = '0x' + message.data.slice(0, 4).toString('hex')
    const fragment = this._iface.getFunction(methodId)
    const functionArgs = this._iface.decodeFunctionData(fragment, toHexString(message.data))

    let ret: any
    if (fragment.name in this._handlers) {
      ret = await this._handlers[fragment.name](...functionArgs)
      ret = ret === null || ret === undefined ? ret : [ret]
    }

    if (fragment.name == 'owner') {
      ret = ['0x' + context.origin.toString('hex')]
    }

    try {
      console.log(`  ← Responding with: ${ret}`)
      const encodedRet = this._iface.encodeFunctionResult(fragment, ret)
      return fromHexString(encodedRet)
    } catch (err) {
      console.log(`Caught encoding error in ovmStateManager: ${err}`)
      throw err
    }
  }

  async hasAccount(address: string): Promise<boolean> {
    return true
  }

  async hasEmptyAccount(address: string): Promise<boolean> {
    return true
  }

  async setAccountNonce(address: string, nonce: BigNumber): Promise<void> {
    const account = await this.vm.pStateManager.getAccount(fromHexString(address))
    account.nonce = new BN(nonce.toNumber()).toArrayLike(Buffer)
    return this.vm.pStateManager.putAccount(fromHexString(address), account)
  }

  async getAccountNonce(address: string): Promise<number> {
    const account = await this.vm.pStateManager.getAccount(fromHexString(address))
    return new BN(account.nonce).toNumber()
  }

  async getAccountEthAddress(address: string): Promise<string> {
    return address
  }

  async getContractStorage(address: string, key: string): Promise<string> {
    const ret = await this.vm.pStateManager.getContractStorage(
      fromHexString(address),
      fromHexString(key),
    )

    return ret.length ? toHexString(ret) : NULL_BYTES32
  }

  async hasContractStorage(address: string, key: string): Promise<boolean> {
    return true
  }

  async putContractStorage(address: string, key: string, value: string): Promise<void> {
    return this.vm.pStateManager.putContractStorage(
      fromHexString(address),
      fromHexString(key),
      fromHexString(value),
    )
  }

  async testAndSetAccountLoaded(address: string): Promise<boolean> {
    return true
  }

  async testAndSetAccountChanged(address: string): Promise<boolean> {
    return true
  }

  async testAndSetContractStorageLoaded(address: string, key: string): Promise<boolean> {
    return true
  }

  async testAndSetContractStorageChanged(address: string, key: string): Promise<boolean> {
    return true
  }
}
