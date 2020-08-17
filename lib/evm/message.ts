import BN = require('bn.js')
import { PrecompileFunc } from './precompiles'
import VM from '../index'
import { toHexString, fromHexString } from '../ovm/utils/buffer-utils'
import { NULL_ADDRESS } from '../ovm/utils/constants'

export default class Message {
  to: Buffer
  value: BN
  caller: Buffer
  gasLimit: BN
  data: Buffer
  depth: number
  code: Buffer | PrecompileFunc
  _codeAddress: Buffer
  isStatic: boolean
  isCompiled: boolean
  salt: Buffer
  selfdestruct: any
  delegatecall: boolean

  // TODO: Add comments here
  skipExecutionManager: boolean
  originalTargetAddress: Buffer

  constructor(opts: any) {
    this.to = opts.to
    this.value = opts.value ? new BN(opts.value) : new BN(0)
    this.caller = opts.caller
    this.gasLimit = opts.gasLimit
    this.data = opts.data || Buffer.alloc(0)
    this.depth = opts.depth || 0
    this.code = opts.code
    this._codeAddress = opts.codeAddress
    this.isStatic = opts.isStatic || false
    this.isCompiled = opts.isCompiled || false // For CALLCODE, TODO: Move from here
    this.salt = opts.salt // For CREATE2, TODO: Move from here
    this.selfdestruct = opts.selfdestruct // TODO: Move from here
    this.delegatecall = opts.delegatecall || false

    // TODO: Add comments here
    this.skipExecutionManager = opts.skipExecutionManager || false
    this.originalTargetAddress = opts.originalTargetAddress
  }

  get codeAddress(): Buffer {
    return this._codeAddress ? this._codeAddress : this.to
  }

  isTargetMessage(): boolean {
    return (
      (!this.to && !this.originalTargetAddress) ||
      (this.to && this.originalTargetAddress && 
        (this.to.equals(this.originalTargetAddress))
      )
    )
  }

  isOvmEntryMessage(): boolean {
    return this.depth === 0 && !this.skipExecutionManager
  }

  toOvmMessage(vm: VM): Message {
    if (!vm._contracts.ExecutionManager.address) {
      throw new Error('Cannot create a message because the ExecutionManager does not exist.')
    }

    const calldata = vm._contracts.ExecutionManager.iface.encodeFunctionData(
      'executeTransaction',
      [
        Math.floor(Date.now() / 1000),
        0,
        this.to ? toHexString(this.to) : NULL_ADDRESS,
        this.data,
        toHexString(this.caller),
        toHexString(this.caller),
        toHexString(this.gasLimit),
        true
      ]
    )

    return new Message({
      ...this,
      ...{
        to: vm._contracts.ExecutionManager.address,
        data: fromHexString(calldata),
        originalTargetAddress: this.to
      }
    })
  }
}
