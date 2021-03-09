import BN = require('bn.js')
import {
  generateAddress,
  generateAddress2,
  KECCAK256_NULL,
  MAX_INTEGER,
  toBuffer,
  zeros,
} from 'ethereumjs-util'
import Account from 'ethereumjs-account'
import { ERROR, VmError } from '../exceptions'
import PStateManager from '../state/promisified'
import { getPrecompile, PrecompileFunc, ripemdPrecompileAddress } from './precompiles'
import TxContext from './txContext'
import Message from './message'
import EEI from './eei'
import { default as Interpreter, InterpreterOpts, RunState } from './interpreter'
import { fromHexString, toHexAddress, toHexString } from '../ovm/utils/buffer-utils'
import { Interface } from 'ethers/lib/utils'
import { ethers } from 'ethers'

const Block = require('ethereumjs-block')

/**
 * Result of executing a message via the [[EVM]].
 */
export interface EVMResult {
  /**
   * Amount of gas used by the transaction
   */
  gasUsed: BN
  /**
   * Address of created account durint transaction, if any
   */
  createdAddress?: Buffer
  /**
   * Contains the results from running the code, if any, as described in [[runCode]]
   */
  execResult: ExecResult
}

/**
 * Result of executing a call via the [[EVM]].
 */
export interface ExecResult {
  runState?: RunState
  /**
   * Description of the exception, if any occured
   */
  exceptionError?: VmError
  /**
   * Amount of gas left
   */
  gas?: BN
  /**
   * Amount of gas the code used to run
   */
  gasUsed: BN
  /**
   * Return value from the contract
   */
  returnValue: Buffer
  /**
   * Array of logs that the contract emitted
   */
  logs?: any[]
  /**
   * A map from the accounts that have self-destructed to the addresses to send their funds to
   */
  selfdestruct?: { [k: string]: Buffer }
  /**
   * Total amount of gas to be refunded from all nested calls.
   */
  gasRefund?: BN
}

export interface NewContractEvent {
  address: Buffer
  // The deployment code
  code: Buffer
}

export function OOGResult(gasLimit: BN): ExecResult {
  return {
    returnValue: Buffer.alloc(0),
    gasUsed: gasLimit,
    exceptionError: new VmError(ERROR.OUT_OF_GAS),
  }
}

/**
 * EVM is responsible for executing an EVM message fully
 * (including any nested calls and creates), processing the results
 * and storing them to state (or discarding changes in case of exceptions).
 * @ignore
 */
export default class EVM {
  _vm: any
  _state: PStateManager
  _tx: TxContext
  _block: any
  /**
   * Amount of gas to refund from deleting storage values
   */
  _refund: BN

  // Custom variables
  _targetMessage: Message | undefined
  _targetMessageResult: EVMResult | undefined
  _accountMessageResult: EVMResult | undefined
  _lastOvmREVERTData: Buffer | undefined

  constructor(vm: any, txContext: TxContext, block: any) {
    this._vm = vm
    this._state = this._vm.pStateManager
    this._tx = txContext
    this._block = block
    this._refund = new BN(0)
  }

  /**
   * Executes an EVM message, determining whether it's a call or create
   * based on the `to` address. It checkpoints the state and reverts changes
   * if an exception happens during the message execution.
   */
  async executeMessage(message: Message): Promise<EVMResult> {
    await this._vm._emit('beforeMessage', message)

    await this._state.checkpoint()

    if (message.depth === 0) {
      const code = await this._state.getContractCode(message.caller)
      if (code.length === 0) {
        await this._state.putContractCode(
          message.caller,
          fromHexString(this._vm.contracts.mockOVM_ECDSAContractAccount.code),
        )
      }

      message = message.toOvmMessage(this._vm, this._block || new Block())
    }

    let isTargetMessage = !this._targetMessage && message.isTargetMessage()
    if (isTargetMessage) {
      this._targetMessage = message
    }

    if (message.isCallToOvmREVERT()) {
      // slice off 4 bytes methodId + 64 bytes abi encode --> gets the raw data passed in
      this._lastOvmREVERTData = message.data.slice(68)
    }

    let result
    if (message.to) {
      const code = await this._state.getContractCode(message.to)
      const isECDSAContractAccount =
        toHexString(code) === this._vm.contracts.mockOVM_ECDSAContractAccount.code
      const target = isECDSAContractAccount
        ? this._vm.getContractByName('mockOVM_ECDSAContractAccount')
        : this._vm.getContract(message.to)

      if (target && target.name === 'OVM_StateManager') {
        result = {
          gasUsed: new BN(0),
          execResult: {
            gasUsed: new BN(0),
            returnValue: await this._vm.ovmStateManager.handleCall(message, this._tx),
          },
        } as EVMResult
      } else {
        result = await this._executeCall(message)
      }
    } else {
      result = await this._executeCreate(message)
    }

    // TODO: Move `gasRefund` to a tx-level result object
    // instead of `ExecResult`.
    result.execResult.gasRefund = this._refund.clone()

    const err = result.execResult.exceptionError
    if (err) {
      result.execResult.logs = []
      await this._state.revert()
    } else {
      await this._state.commit()
    }

    if (isTargetMessage) {
      this._targetMessageResult = result
    }

    let wasDeployException = false
    if (message.depth === 0) {
      if (this._targetMessageResult) {
        if (result.execResult.logs) {
          result.execResult.logs = result.execResult.logs.filter(log => {
            return !log[0].equals(this._vm.contracts.OVM_ExecutionManager.address)
          })
        }

        // OVM reverts have some flag-related metadata before the revert data--strip this out for providers etc.
        let returnData: Buffer = this._targetMessageResult.execResult.returnValue
        if (!!this._targetMessageResult.execResult.exceptionError && returnData.byteLength >= 160) {
          returnData = returnData.slice(160)
        }

        const EOAReturnedFalse =
          this._accountMessageResult?.execResult.returnValue.slice(0, 32).toString('hex') ==
          '00'.repeat(32)
        wasDeployException =
          EOAReturnedFalse && !this._targetMessageResult.execResult.exceptionError
        const exceptionError = wasDeployException
          ? new VmError(ERROR.REVERT)
          : this._targetMessageResult.execResult.exceptionError

          // The OVM does not allow for EVM creation messages that revert.
          // We can recover the initcode's intended revert data by checking the last call to ovmREVERT.
          if (wasDeployException && !!this._lastOvmREVERTData) {
            returnData = this._lastOvmREVERTData
          }

        result = {
          ...result,
          createdAddress: this._targetMessageResult.createdAddress,
          execResult: {
            ...result.execResult,
            returnValue: returnData,
            exceptionError,
          },
        }
      } else {
        // todo: detect OVM-specific error cases and surface here
        result.execResult.exceptionError = new VmError(ERROR.OVM_ERROR)
      }
    }

    if (
      message.depth == 1 &&
      message.to.toString() != this._vm.contracts.OVM_StateManager.address.toString()
    ) {
      this._accountMessageResult = result
    }

    await this._vm._emit('afterMessage', result)

    return result
  }

  async _executeCall(message: Message): Promise<EVMResult> {
    const account = await this._state.getAccount(message.caller)
    // Reduce tx value from sender
    if (!message.delegatecall) {
      await this._reduceSenderBalance(account, message)
    }
    // Load `to` account
    const toAccount = await this._state.getAccount(message.to)
    // Add tx value to the `to` account
    if (!message.delegatecall) {
      await this._addToBalance(toAccount, message)
    }

    // Load code
    await this._loadCode(message)
    if (!message.code || message.code.length === 0) {
      return {
        gasUsed: new BN(0),
        execResult: {
          gasUsed: new BN(0),
          returnValue: Buffer.alloc(0),
        },
      }
    }

    let result: ExecResult
    if (message.isCompiled) {
      result = this.runPrecompile(message.code as PrecompileFunc, message.data, message.gasLimit)
    } else {
      result = await this.runInterpreter(message)
    }

    return {
      gasUsed: result.gasUsed,
      execResult: result,
    }
  }

  async _executeCreate(message: Message): Promise<EVMResult> {
    const account = await this._state.getAccount(message.caller)
    // Reduce tx value from sender
    await this._reduceSenderBalance(account, message)

    message.code = message.data
    message.data = Buffer.alloc(0)
    message.to = await this._generateAddress(message)
    let toAccount = await this._state.getAccount(message.to)
    // Check for collision
    if (
      (toAccount.nonce && new BN(toAccount.nonce).gtn(0)) ||
      toAccount.codeHash.compare(KECCAK256_NULL) !== 0
    ) {
      return {
        gasUsed: message.gasLimit,
        createdAddress: message.to,
        execResult: {
          returnValue: Buffer.alloc(0),
          exceptionError: new VmError(ERROR.CREATE_COLLISION),
          gasUsed: message.gasLimit,
        },
      }
    }

    await this._state.clearContractStorage(message.to)

    const newContractEvent: NewContractEvent = {
      address: message.to,
      code: message.code,
    }

    await this._vm._emit('newContract', newContractEvent)

    toAccount = await this._state.getAccount(message.to)
    toAccount.nonce = new BN(toAccount.nonce).addn(1).toArrayLike(Buffer)

    // Add tx value to the `to` account
    await this._addToBalance(toAccount, message)

    if (!message.code || message.code.length === 0) {
      console.error(`Could not load code for: ${toHexString(message.to)}`)
      return {
        gasUsed: new BN(0),
        createdAddress: message.to,
        execResult: {
          gasUsed: new BN(0),
          returnValue: Buffer.alloc(0),
        },
      }
    }

    let result = await this.runInterpreter(message)

    // fee for size of the return value
    let totalGas = result.gasUsed
    if (!result.exceptionError) {
      const returnFee = new BN(
        result.returnValue.length * this._vm._common.param('gasPrices', 'createData'),
      )
      totalGas = totalGas.add(returnFee)
    }

    // if not enough gas
    if (
      totalGas.lte(message.gasLimit) &&
      (this._vm.allowUnlimitedContractSize || result.returnValue.length <= 24576)
    ) {
      result.gasUsed = totalGas
    } else {
      result = { ...result, ...OOGResult(message.gasLimit) }
    }

    // Save code if a new contract was created
    if (!result.exceptionError && result.returnValue && result.returnValue.toString() !== '') {
      await this._state.putContractCode(message.to, result.returnValue)
    }

    return {
      gasUsed: result.gasUsed,
      createdAddress: message.to,
      execResult: result,
    }
  }

  /**
   * Starts the actual bytecode processing for a CALL or CREATE, providing
   * it with the [[EEI]].
   */
  async runInterpreter(message: Message, opts: InterpreterOpts = {}): Promise<ExecResult> {
    const env = {
      blockchain: this._vm.blockchain, // Only used in BLOCKHASH
      address: message.to || zeros(32),
      caller: message.caller || zeros(32),
      callData: message.data || Buffer.from([0]),
      callValue: message.value || new BN(0),
      code: message.code as Buffer,
      isStatic: message.isStatic || false,
      depth: message.depth || 0,
      gasPrice: this._tx.gasPrice,
      origin: this._tx.origin || message.caller || zeros(32),
      block: this._block || new Block(),
      contract: await this._state.getAccount(message.to || zeros(32)),
      codeAddress: message.codeAddress,
      originalTargetAddress: message.originalTargetAddress,
    }
    const eei = new EEI(env, this._state, this, this._vm._common, message.gasLimit.clone())
    if (message.selfdestruct) {
      eei._result.selfdestruct = message.selfdestruct
    }

    const oldRefund = this._refund.clone()
    const interpreter = new Interpreter(this._vm, eei)
    const interpreterRes = await interpreter.run(message.code as Buffer, opts)

    let result = eei._result
    let gasUsed = message.gasLimit.sub(eei._gasLeft)
    if (interpreterRes.exceptionError) {
      if (interpreterRes.exceptionError.error !== ERROR.REVERT) {
        gasUsed = message.gasLimit
      }

      // Clear the result on error
      result = {
        ...result,
        logs: [],
        selfdestruct: {},
      }
      // Revert gas refund if message failed
      this._refund = oldRefund
    }

    return {
      ...result,
      runState: {
        ...interpreterRes.runState!,
        ...result,
        ...eei._env,
      },
      exceptionError: interpreterRes.exceptionError,
      gas: eei._gasLeft,
      gasUsed,
      returnValue: result.returnValue ? result.returnValue : Buffer.alloc(0),
    }
  }

  /**
   * Returns code for precompile at the given address, or undefined
   * if no such precompile exists.
   */
  getPrecompile(address: Buffer): PrecompileFunc {
    return getPrecompile(address.toString('hex'))
  }

  /**
   * Executes a precompiled contract with given data and gas limit.
   */
  runPrecompile(code: PrecompileFunc, data: Buffer, gasLimit: BN): ExecResult {
    if (typeof code !== 'function') {
      throw new Error('Invalid precompile')
    }

    const opts = {
      data,
      gasLimit,
      _common: this._vm._common,
    }

    return code(opts)
  }

  async _loadCode(message: Message): Promise<void> {
    if (!message.code) {
      const precompile = this.getPrecompile(message.codeAddress)
      if (precompile) {
        message.code = precompile
        message.isCompiled = true
      } else {
        message.code = await this._state.getContractCode(message.codeAddress)
        message.isCompiled = false
      }
    }
  }

  async _generateAddress(message: Message): Promise<Buffer> {
    return fromHexString(
      toHexAddress(
        await this._state.getContractStorage(
          this._vm.contracts.OVM_ExecutionManager.address,
          Buffer.from('00'.repeat(31) + '0f', 'hex'),
        ),
      ),
    )
  }

  async _reduceSenderBalance(account: Account, message: Message): Promise<void> {
    const newBalance = new BN(account.balance).sub(message.value)
    account.balance = toBuffer(newBalance)
    return this._state.putAccount(toBuffer(message.caller), account)
  }

  async _addToBalance(toAccount: Account, message: Message): Promise<void> {
    const newBalance = new BN(toAccount.balance).add(message.value)
    if (newBalance.gt(MAX_INTEGER)) {
      throw new Error('Value overflow')
    }
    toAccount.balance = toBuffer(newBalance)
    // putAccount as the nonce may have changed for contract creation
    return this._state.putAccount(toBuffer(message.to), toAccount)
  }

  async _touchAccount(address: Buffer): Promise<void> {
    const acc = await this._state.getAccount(address)
    return this._state.putAccount(address, acc)
  }
}
