/* External Imports */
import { Interface } from '@ethersproject/abi'

import * as ExecutionManagerJSON from './defs/ExecutionManager.json'
import * as StateManagerJSON from './defs/StateManager.json'

export const iExecutionManager = new Interface(ExecutionManagerJSON.abi)
export const iStateManager = new Interface(StateManagerJSON.abi)
