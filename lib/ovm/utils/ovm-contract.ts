/* External Imports */
import { Interface } from '@ethersproject/abi'

/* Internal Imports */
import VM from '../../index'
import { sendOvmTransaction } from './ovm-transaction'
import { NULL_ADDRESS } from './constants'
import { toHexString } from './buffer-utils'

export interface OVMContractOpts {
  vm: VM
  iface: Interface
  name: string
  address?: Buffer
  bytecode?: string
}

export class OVMContract {
  vm: VM
  iface: Interface
  name: string
  address?: Buffer
  bytecode?: string

  constructor(opts: OVMContractOpts) {
    this.vm = opts.vm
    this.iface = opts.iface
    this.name = opts.name
    this.address = opts.address
    this.bytecode = opts.bytecode
  }

  get addressHex(): string {
    if (!this.address) {
      throw new Error('Contract does not currently have an address.')
    }

    return '0x' + this.address.toString('hex')
  }

  async deploy(constructorArgs: any[] = []): Promise<void> {
    if (!this.bytecode) {
      throw new Error('Cannot deploy contract without bytecode.')
    }

    const encodedArgs = this.iface.encodeDeploy(constructorArgs).slice(2)
    const calldata = this.bytecode + encodedArgs

    const deployResult = await sendOvmTransaction(this.vm, calldata, NULL_ADDRESS, undefined)

    this.address = deployResult.createdAddress
  }

  async sendTransaction(functionName: string, functionArgs: any[] = []): Promise<any> {
    if (!this.address) {
      throw new Error('Cannot send transaction to an undeployed contract.')
    }

    const calldata = this.iface.encodeFunctionData(functionName, functionArgs)

    const txResult = await sendOvmTransaction(this.vm, calldata, NULL_ADDRESS, this.address)

    return this.iface.decodeFunctionResult(functionName, txResult.execResult.returnValue)
  }

  decodeFunctionData(
    data: Buffer,
  ): {
    functionName: string
    functionArgs: any[]
  } {
    const methodId = toHexString(data.slice(0, 4))
    const fragment = this.iface.getFunction(methodId)
    const functionArgs = this.iface.decodeFunctionData(fragment, toHexString(data)) as any[]

    return {
      functionName: fragment.name,
      functionArgs: functionArgs,
    }
  }
}
