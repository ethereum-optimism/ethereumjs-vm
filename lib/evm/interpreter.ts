import BN = require('bn.js')
import Common from 'ethereumjs-common'
import { StateManager } from '../state'
import PStateManager from '../state/promisified'
import { ERROR, VmError } from '../exceptions'
import Memory from './memory'
import Stack from './stack'
import EEI from './eei'
import { Opcode } from './opcodes'
import { handlers as opHandlers, OpHandler } from './opFns'
import Account from 'ethereumjs-account'

import { Logger } from '../ovm/utils/logger'
import { env } from 'process'
import { toHexAddress, toHexString } from '../ovm/utils/buffer-utils'
import { iExecutionManager } from '../ovm/contracts'

const logger = new Logger('ethjs-ovm:interpreter')

export interface InterpreterOpts {
  pc?: number
}

export interface RunState {
  programCounter: number
  opCode: number
  memory: Memory
  memoryWordCount: BN
  highestMemCost: BN
  stack: Stack
  code: Buffer
  validJumps: number[]
  _common: Common
  stateManager: StateManager
  eei: EEI
}

export interface InterpreterResult {
  runState?: RunState
  exceptionError?: VmError
}

export interface InterpreterStep {
  gasLeft: BN
  stateManager: StateManager
  stack: BN[]
  pc: number
  depth: number
  address: Buffer
  memory: number[]
  memoryWordCount: BN
  opcode: Opcode
  account: Account
  codeAddress: Buffer
}

/**
 * Parses and executes EVM bytecode.
 */
export default class Interpreter {
  _vm: any
  _state: PStateManager
  _runState: RunState
  _eei: EEI
  _printNextMemory: boolean = false
  _loggers: {
    [depth: number]: {
      callLogger: Logger
      stepLogger: Logger
      memLogger: Logger
    }
  }

  constructor(vm: any, eei: EEI) {
    this._vm = vm // TODO: remove when not needed
    this._state = vm.pStateManager
    this._eei = eei
    this._runState = {
      programCounter: 0,
      opCode: 0xfe, // INVALID opcode
      memory: new Memory(),
      memoryWordCount: new BN(0),
      highestMemCost: new BN(0),
      stack: new Stack(),
      code: Buffer.alloc(0),
      validJumps: [],
      // TODO: Replace with EEI methods
      _common: this._vm._common,
      stateManager: this._state._wrapped,
      eei: this._eei,
    }

    this._loggers = {}
  }

  async run(code: Buffer, opts: InterpreterOpts = {}): Promise<InterpreterResult> {
    this._runState.code = code
    this._runState.programCounter = opts.pc || this._runState.programCounter
    this._runState.validJumps = this._getValidJumpDests(code)

    // Check that the programCounter is in range
    const pc = this._runState.programCounter
    if (pc !== 0 && (pc < 0 || pc >= this._runState.code.length)) {
      throw new Error('Internal error: program counter not in range')
    }

    let err
    // Iterate through the given ops until something breaks or we hit STOP
    while (this._runState.programCounter < this._runState.code.length) {
      const opCode = this._runState.code[this._runState.programCounter]
      this._runState.opCode = opCode
      await this._runStepHook()

      try {
        await this.runStep()
      } catch (e) {
        // STOP is not an exception
        if (e.error !== ERROR.STOP) {
          err = e
        }
        // TODO: Throw on non-VmError exceptions
        break
      }
    }

    return {
      runState: this._runState,
      exceptionError: err,
    }
  }

  /**
   * Executes the opcode to which the program counter is pointing,
   * reducing it's base gas cost, and increments the program counter.
   */
  async runStep(): Promise<void> {
    const opInfo = this.lookupOpInfo(this._runState.opCode)
    // Check for invalid opcode
    if (opInfo.name === 'INVALID') {
      throw new VmError(ERROR.INVALID_OPCODE)
    }

    // Reduce opcode's base fee
    this._eei.useGas(new BN(opInfo.fee))
    // Advance program counter
    this._runState.programCounter++

    // Execute opcode handler
    const opFn = this.getOpHandler(opInfo)
    if (opInfo.isAsync) {
      await opFn.apply(null, [this._runState])
    } else {
      opFn.apply(null, [this._runState])
    }
  }

  /**
   * Get the handler function for an opcode.
   */
  getOpHandler(opInfo: Opcode): OpHandler {
    return opHandlers[opInfo.name]
  }

  /**
   * Get info for an opcode from VM's list of opcodes.
   */
  lookupOpInfo(op: number, full: boolean = false): Opcode {
    const opcode = this._vm._opcodes[op]
      ? this._vm._opcodes[op]
      : { name: 'INVALID', fee: 0, isAsync: false }

    if (full) {
      let name = opcode.name
      if (name === 'LOG') {
        name += op - 0xa0
      }

      if (name === 'PUSH') {
        name += op - 0x5f
      }

      if (name === 'DUP') {
        name += op - 0x7f
      }

      if (name === 'SWAP') {
        name += op - 0x8f
      }
      return { ...opcode, ...{ name } }
    }

    return opcode
  }

  async _runStepHook(): Promise<void> {
    const eventObj: InterpreterStep = {
      pc: this._runState.programCounter,
      gasLeft: this._eei.getGasLeft(),
      opcode: this.lookupOpInfo(this._runState.opCode, true),
      stack: this._runState.stack._store,
      depth: this._eei._env.depth,
      address: this._eei._env.address,
      account: this._eei._env.contract,
      stateManager: this._runState.stateManager,
      memory: this._runState.memory._store, // Return underlying array for backwards-compatibility
      memoryWordCount: this._runState.memoryWordCount,
      codeAddress: this._eei._env.codeAddress,
    }

    try {
      this._logStep(eventObj)
    } catch (err) {
      logger.log(`STEP LOGGING ERROR: ${err.toString()}`)
    }

    /**
     * The `step` event for trace output
     *
     * @event Event: step
     * @type {Object}
     * @property {Number} pc representing the program counter
     * @property {String} opcode the next opcode to be ran
     * @property {BN} gasLeft amount of gasLeft
     * @property {Array} stack an `Array` of `Buffers` containing the stack
     * @property {Account} account the [`Account`](https://github.com/ethereum/ethereumjs-account) which owns the code running
     * @property {Buffer} address the address of the `account`
     * @property {Number} depth the current number of calls deep the contract is
     * @property {Buffer} memory the memory of the VM as a `buffer`
     * @property {BN} memoryWordCount current size of memory in words
     * @property {StateManager} stateManager a [`StateManager`](stateManager.md) instance (Beta API)
     */
    return this._vm._emit('step', eventObj)
  }

  // Returns all valid jump destinations.
  _getValidJumpDests(code: Buffer): number[] {
    const jumps = []

    for (let i = 0; i < code.length; i++) {
      const curOpCode = this.lookupOpInfo(code[i]).name

      // no destinations into the middle of PUSH
      if (curOpCode === 'PUSH') {
        i += code[i] - 0x5f
      }

      if (curOpCode === 'JUMPDEST') {
        jumps.push(i)
      }
    }

    return jumps
  }

  _logStep(step: InterpreterStep): void {
    if (!env.DEBUG?.includes(logger.namespace) && !logger.enabled) {
      return
    }

    if (!(step.depth in this._loggers)) {
      const contractName = this._vm.getContractName(step.address)
      const description = step.depth === 0 ? 'OVM TX starts with' : 'EVM STEPS for'

      const callLogger = new Logger(logger.namespace + ':calls')
      const stepLogger = new Logger(callLogger.namespace + ':steps')
      const memLogger = new Logger(callLogger.namespace + ':memory')

      callLogger.open(`${description} ${contractName} at depth ${step.depth}`)

      this._loggers[step.depth] = {
        callLogger,
        stepLogger,
        memLogger,
      }
    }

    const loggers = this._loggers[step.depth]
    const stack = new Array(...step.stack).reverse()
    const memory = step.memory
    const op = step.opcode.name

    if (op === 'RETURN' || op === 'REVERT') {
      const offset = stack[0].toNumber()
      const length = stack[1].toNumber()

      const data = Buffer.from(memory.slice(offset, offset + length))

      loggers.callLogger.log(`${op} with data: ${toHexString(data)}`)
      loggers.callLogger.close()
      delete this._loggers[step.depth]
    } else if (op === 'CALL') {
      const target = stack[1].toBuffer()
      const offset = stack[3].toNumber()
      const length = stack[4].toNumber()

      const calldata = Buffer.from(memory.slice(offset, offset + length))

      if (target.equals(this._vm.contracts.ovmExecutionManager.address)) {
        const sighash = toHexString(calldata.slice(0, 4))
        const fragment = iExecutionManager.getFunction(sighash)
        const functionName = fragment.name
        const functionArgs = iExecutionManager.decodeFunctionData(
          fragment,
          toHexString(calldata),
        ) as any[]

        loggers.callLogger.log(
          `CALL to OVM_ExecutionManager.${functionName}\nDecoded calldata: ${functionArgs}\nEncoded calldata: ${toHexString(
            calldata.slice(4),
          )}`,
        )
      } else {
        loggers.callLogger.log(
          `CALL to ${toHexAddress(target)} with data:\n${toHexString(calldata)}`,
        )
      }
    } else {
      loggers.stepLogger.log(
        `opcode: ${op.padEnd(20, ' ')}\npc: ${step.pc}\nstack: [${stack
          .map((el, idx) => {
            return `${idx}: ${toHexString(el)}`
          })
          .join('')}]\n`,
      )

      if (
        this._printNextMemory ||
        ['CALL', 'CREATE', 'CREATE2', 'STATICCALL', 'DELEGATECALL'].includes(op)
      ) {
        loggers.memLogger.log(`memory: [${toHexString(Buffer.from(memory))}]`)
      }

      this._printNextMemory = ['MSTORE', 'CALLDATACOPY', 'RETURNDATACOPY', 'CODECOPY'].includes(op)
    }
  }
}
