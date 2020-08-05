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
import StateManager from './stateManager'
import { StateManagerOpts } from './stateManager'
/**
 * OVM Interface for getting and setting state
 * from the Execution Manager.
 */
export default class OVMStateManager extends StateManager {

  /**
   * Instantiate the StateManager interface.
   */
  constructor(opts: StateManagerOpts = {}) {
    super(opts)
  }

}
