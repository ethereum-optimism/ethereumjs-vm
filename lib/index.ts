import BN = require('bn.js')
import Account from 'ethereumjs-account'
import Blockchain from 'ethereumjs-blockchain'
import Common from 'ethereumjs-common'
import { StateManager } from './state'
import { default as runCode, RunCodeOpts } from './runCode'
import { default as runCall, RunCallOpts } from './runCall'
import { default as runTx, RunTxOpts, RunTxResult } from './runTx'
import { default as runBlock, RunBlockOpts, RunBlockResult } from './runBlock'
import { EVMResult, ExecResult } from './evm/evm'
import { OpcodeList, getOpcodesForHF } from './evm/opcodes'
import runBlockchain from './runBlockchain'
import PStateManager from './state/promisified'
import { OvmStateManager } from './ovm/ovm-state-manager'
const promisify = require('util.promisify')
const AsyncEventEmitter = require('async-eventemitter')
const Trie = require('merkle-patricia-tree/secure.js')

// Custom imports
import { Interface } from '@ethersproject/abi'
import { fromHexString } from './ovm/utils/buffer-utils'

interface OVMContract {
  name: string
  address: Buffer
  addressHex: string
  code: string
  iface: any
}

interface StorageDump {
  [key: string]: string
}

interface StateDump {
  accounts: {
    [name: string]: {
      address: string
      code: string
      codeHash: string
      storage: StorageDump
      abi: any
    }
  }
}

/**
 * Options for instantiating a [[VM]].
 */
export interface VMOpts {
  /**
   * The chain the VM operates on
   */
  chain?: string
  /**
   * Hardfork rules to be used
   */
  hardfork?: string
  /**
   * A [[StateManager]] instance to use as the state store (Beta API)
   */
  stateManager?: StateManager
  /**
   * A [merkle-patricia-tree](https://github.com/ethereumjs/merkle-patricia-tree) instance for the state tree (ignored if stateManager is passed)
   * @deprecated
   */
  state?: any // TODO
  /**
   * A [blockchain](https://github.com/ethereumjs/ethereumjs-blockchain) object for storing/retrieving blocks
   */
  blockchain?: Blockchain
  /**
   * If true, create entries in the state tree for the precompiled contracts, saving some gas the
   * first time each of them is called.
   *
   * If this parameter is false, the first call to each of them has to pay an extra 25000 gas
   * for creating the account.
   *
   * Setting this to true has the effect of precompiled contracts' gas costs matching mainnet's from
   * the very first call, which is intended for testing networks.
   */
  activatePrecompiles?: boolean
  /**
   * Allows unlimited contract sizes while debugging. By setting this to `true`, the check for contract size limit of 24KB (see [EIP-170](https://git.io/vxZkK)) is bypassed
   */
  allowUnlimitedContractSize?: boolean
  common?: Common

  ovmOpts?: {
    initialized?: boolean
    emGasLimit?: number
    dump?: StateDump
    contracts?: {
      [name: string]: OVMContract
    }
  }
}

/**
 * Execution engine which can be used to run a blockchain, individual
 * blocks, individual transactions, or snippets of EVM bytecode.
 *
 * This class is an AsyncEventEmitter, please consult the README to learn how to use it.
 */
export default class VM extends AsyncEventEmitter {
  opts: VMOpts
  _common: Common
  stateManager: StateManager
  blockchain: Blockchain
  allowUnlimitedContractSize: boolean
  _opcodes: OpcodeList
  public readonly _emit: (topic: string, data: any) => Promise<void>
  public readonly pStateManager: PStateManager

  // Custom variables
  emGasLimit: number
  initialized: boolean
  dump: StateDump | undefined
  ovmStateManager: OvmStateManager
  contracts: {
    [name: string]: OVMContract
  }

  /**
   * Instantiates a new [[VM]] Object.
   * @param opts - Default values for the options are:
   *  - `chain`: 'mainnet'
   *  - `hardfork`: 'petersburg' [supported: 'byzantium', 'constantinople', 'petersburg', 'istanbul' (DRAFT) (will throw on unsupported)]
   *  - `activatePrecompiles`: false
   *  - `allowUnlimitedContractSize`: false [ONLY set to `true` during debugging]
   */
  constructor(opts: VMOpts = {}) {
    super()

    this.opts = opts

    if (opts.common) {
      if (opts.chain || opts.hardfork) {
        throw new Error(
          'You can only instantiate the VM class with one of: opts.common, or opts.chain and opts.hardfork',
        )
      }

      this._common = opts.common
    } else {
      const chain = opts.chain ? opts.chain : 'mainnet'
      const hardfork = opts.hardfork ? opts.hardfork : 'petersburg'
      const supportedHardforks = [
        'byzantium',
        'constantinople',
        'petersburg',
        'istanbul',
        'muirGlacier',
      ]

      this._common = new Common(chain, hardfork, supportedHardforks)
    }

    // Set list of opcodes based on HF
    this._opcodes = getOpcodesForHF(this._common)

    if (opts.stateManager) {
      this.stateManager = opts.stateManager
    } else {
      const trie = opts.state || new Trie()
      if (opts.activatePrecompiles) {
        for (let i = 1; i <= 8; i++) {
          trie.put(new BN(i).toArrayLike(Buffer, 'be', 20), new Account().serialize())
        }
      }
      this.stateManager = new StateManager({ trie, common: this._common })
    }

    this.pStateManager = new PStateManager(this.stateManager)

    this.blockchain = opts.blockchain || new Blockchain({ common: this._common })

    this.allowUnlimitedContractSize =
      opts.allowUnlimitedContractSize === undefined ? false : opts.allowUnlimitedContractSize

    // OVM option setup.
    const ovmOpts = opts.ovmOpts || {}
    this.emGasLimit = ovmOpts.emGasLimit || 100_000_000
    this.dump = ovmOpts.dump
    this.initialized = ovmOpts.initialized || false

    if (ovmOpts.contracts) {
      this.contracts = ovmOpts.contracts
    } else {
      if (!this.dump) {
        throw new Error('You must provide a state dump to initialize the OVM.')
      }

      this.contracts = {}
      for (const [name, account] of Object.entries(this.dump.accounts)) {
        this.contracts[name] = {
          name,
          address: fromHexString(account.address),
          addressHex: account.address,
          code: account.code,
          iface: new Interface(account.abi)
        }
      }
    }

    // Always need an instance of this.
    this.ovmStateManager = new OvmStateManager({
      vm: this,
    })

    // We cache this promisified function as it's called from the main execution loop, and
    // promisifying each time has a huge performance impact.
    const emit = promisify(this.emit.bind(this))
    this._emit = async (topic: string, data: any): Promise<void> => {
      if (data) {
        const addresses = [data.address, data.to]
        for (const address of addresses) {
          if (address) {
            const addr = address.toString('hex')
            if (addr.startsWith('deaddeaddead')) {
              return
            }
          }
        }
      }

      emit(topic, data)
    }
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (!this.dump) {
      throw new Error('You must provide a state dump to initialize the OVM.')
    }

    this.initialized = true

    for (const account of Object.values(this.dump.accounts)) {
      await this.pStateManager.putAccount(fromHexString(account.address), new Account())

      await this.pStateManager.putContractCode(
        fromHexString(account.address),
        fromHexString(account.code),
      )

      for (const [key, val] of Object.entries(account.storage)) {
        await this.pStateManager.putContractStorage(
          fromHexString(account.address),
          Buffer.from(key, 'hex'),
          Buffer.from(val, 'hex'),
        )
      }
    }
  }

  /**
   * Processes blocks and adds them to the blockchain.
   *
   * This method modifies the state.
   *
   * @param blockchain -  A [blockchain](https://github.com/ethereum/ethereumjs-blockchain) object to process
   */
  async runBlockchain(blockchain: any): Promise<void> {
    await this.init()
    return runBlockchain.bind(this)(blockchain)
  }

  /**
   * Processes the `block` running all of the transactions it contains and updating the miner's account
   *
   * This method modifies the state. If `generate` is `true`, the state modifications will be
   * reverted if an exception is raised. If it's `false`, it won't revert if the block's header is
   * invalid. If an error is thrown from an event handler, the state may or may not be reverted.
   *
   * @param opts - Default values for options:
   *  - `generate`: false
   */
  async runBlock(opts: RunBlockOpts): Promise<RunBlockResult> {
    await this.init()
    return runBlock.bind(this)(opts)
  }

  /**
   * Process a transaction. Run the vm. Transfers eth. Checks balances.
   *
   * This method modifies the state. If an error is thrown, the modifications are reverted, except
   * when the error is thrown from an event handler. In the latter case the state may or may not be
   * reverted.
   */
  async runTx(opts: RunTxOpts): Promise<RunTxResult> {
    await this.init()
    return runTx.bind(this)(opts)
  }

  /**
   * runs a call (or create) operation.
   *
   * This method modifies the state.
   */
  async runCall(opts: RunCallOpts): Promise<EVMResult> {
    await this.init()
    return runCall.bind(this)(opts)
  }

  /**
   * Runs EVM code.
   *
   * This method modifies the state.
   */
  async runCode(opts: RunCodeOpts): Promise<ExecResult> {
    await this.init()
    return runCode.bind(this)(opts)
  }

  /**
   * Returns a copy of the [[VM]] instance.
   */
  copy(): VM {
    return new VM({
      stateManager: this.stateManager.copy(),
      blockchain: this.blockchain,
      common: this._common,
      ovmOpts: this.opts.ovmOpts,
    })
  }

  getContract(address: Buffer): OVMContract | undefined {
    return Object.values(this.contracts).find((contract) => {
      return contract.address.equals(address)
    })
  }

  getContractByName(name: string): OVMContract | undefined {
    return Object.values(this.contracts).find((contract) => {
      return contract.name === name
    })
  }
}
