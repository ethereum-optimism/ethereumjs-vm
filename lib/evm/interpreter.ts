import BN = require('bn.js')
import Common from 'ethereumjs-common'
import { StateManager } from '../state'
import PStateManager from '../state/promisified'
import { ERROR, VmError } from '../exceptions'
import Memory from './memory'
import Stack from './stack'
import EEI from './eei'
import { Logger, ScopedLogger } from '../ovm/utils/logger'
import { Opcode } from './opcodes'
import { handlers as opHandlers, OpHandler } from './opFns'
import Account from 'ethereumjs-account'
import { env, off } from 'process'
import { add } from 'lodash'

const logger = new Logger('ethjs-ovm')

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

let printNextMem = false

const padToLengthIfPossible = (str: string, len: number):string => {
  return str.length > len ? str : str + ' '.repeat(len - str.length)
}

/**
 * Parses and executes EVM bytecode.
 */
export default class Interpreter {
  _vm: any
  _state: PStateManager
  _runState: RunState
  _eei: EEI
  _executionLoggers: Map<number, {callLogger: ScopedLogger, stepLogger: Logger, memLogger: Logger}>

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
    this._executionLoggers = new Map<number, {callLogger: ScopedLogger, stepLogger: Logger, memLogger: Logger}>()
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

    for (const [depth, {callLogger, stepLogger}] of this._executionLoggers.entries()) {
      callLogger.close()
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

    if (env.DEBUG_OVM === 'true') {
      try {
        this.logStep(eventObj)
      } catch(e) {
        logger.log(`Caught error logging VM step: ${JSON.stringify(e)}`)
      }
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
  
  logStep(info: InterpreterStep) {
    if (!this._eei._env.isOvmCall) { return }

    const opName = info.opcode.name

    const curAddress = info['address'].toString('hex')
    const curDepth = info['depth']

    let scope = curAddress.slice(0, 8) + '...:d' + info['depth']
    if (!this._executionLoggers.has(curDepth)) {
      let addrName = curAddress
      for (const ovmContract of Object.keys(this._vm._contracts)) {
        if (!!this._vm._contracts[ovmContract].address) {
          if (curAddress == (this._vm._contracts[ovmContract].address.toString('hex'))) {
            addrName = ovmContract
            scope = new Map<string, string>([
              ['AddressResolver', 'addr-rslvr'],
              ['StateManager', 'state-mgr'],
              ['SafetyChecker', 'safety-chkr'],
              ['ExecutionManager', 'exe-mgr']
            ]).get(ovmContract) || ovmContract
          }
        }
      }
      const descriptionStart = curDepth === 0 ? 'OVM TX. starts with ' : 'EVM STEPS for '
      const callLogger = logger.scope('evm', descriptionStart + addrName + ' at depth ' + curDepth,  scope)
      const stepLogger = new Logger(callLogger.getNamespace() + ':steps')
      const memLogger = new Logger(callLogger.getNamespace() + ':memory')
      callLogger.open()
      this._executionLoggers.set(
        curDepth,
        {callLogger, stepLogger, memLogger}
      )
    }

    let callLogger
    let stepLogger
    let memLogger
    const loggers = this._executionLoggers.get(curDepth)
    if (!!loggers) {
      callLogger = loggers.callLogger
      stepLogger = loggers.stepLogger
      memLogger = loggers.memLogger
    }
    if (callLogger === undefined || stepLogger === undefined || memLogger === undefined) {return}

    const curMemory = info['memory']

    let stack

    if (['RETURN', 'REVERT'].includes(opName)) {
      stack = new Array(...info['stack']).reverse()
      const offset = stack[0]
      const length = stack[1]
      const returnOrRevertData = Buffer.from(curMemory.slice(offset.toNumber(), offset.toNumber()+length.toNumber()))
      callLogger.log(opName + ' with data: 0x' + returnOrRevertData.toString('hex'))
      callLogger.close()
      this._executionLoggers.delete(curDepth)
      return
    }

    if (opName == 'CALL') {
      stack = new Array(...info['stack']).reverse()
      const target = stack[1].toBuffer()
      const argsOffset = stack[3]
      const argsLength = stack[4]
      const calldata = Buffer.from(curMemory.slice(argsOffset.toNumber(), argsOffset.toNumber()+argsLength.toNumber()))
      if (!!this._vm._contracts.ExecutionManager.address) {
        if (target.equals(this._vm._contracts.ExecutionManager.address)) {
          const {
            functionName,
            functionArgs,
          } = this._vm._contracts.ExecutionManager.decodeFunctionData(calldata)
          callLogger.log(
            `CALL to ExecutionManager.${functionName} with: ${functionArgs} (raw w/o sighash): 0x${calldata.slice(4).toString('hex')})`,
          )
        } else {
          callLogger.log(`CALL to ${target.toString('hex')} with data: \n0x${calldata.toString('hex')}`)
        }
      }
      return
    }

    const printThisMem: boolean = ['CALL', 'CREATE', 'CREATE2', 'STATICCALL', 'DELEGATECALL'].includes(
      opName,
    ) || printNextMem
    printNextMem = false
      
    if (['MSTORE', 'CALLDATACOPY', 'RETUNDATACOPY', 'CODECOPY'].includes(opName)) {
      printNextMem = true
    }

    if (stack === undefined) {
      stack = new Array(...info['stack']).reverse()
    }    

    stepLogger.log(
      `op:${
        padToLengthIfPossible(opName, 9)
      }stack:[  ${
        stack.map((stackEl) => {
            return '0x' + stackEl.toString("hex")
          }
        )
        }], pc:0x${
          info['pc'].toString(6)
        }`,
    )

    if (printThisMem) {
      memLogger.log(`[${'0x' + Buffer.from(curMemory).toString('hex')}]`)
    }
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
}
