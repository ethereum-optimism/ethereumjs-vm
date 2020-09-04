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
import {InterpreterStep} from './interpreter'

const logger = new Logger('ethjs-ovm')

let gasOpts: any = {
  insideTx: false,
  startGas: 0,
  prevGasLeft: 0,
  prevDepth: 0,
  curDomain: '',
  tracking: {}
}

export default function logGas(info: InterpreterStep, _vm: any) {
  const opName = info.opcode.name

  let curAddress = info['address'].toString('hex')
  for (const ovmContract of Object.keys(_vm._contracts)) {
    if (!!_vm._contracts[ovmContract].address) {
      if (curAddress == _vm._contracts[ovmContract].address.toString('hex')) {
        curAddress = ovmContract
      }
    }
  }
  const curDepth = info['depth']

  // start keeping track of gas! start of tx
  if (curDepth === 0 && !gasOpts.insideTx) {
    console.log('STARTING A TX!', curAddress)
    gasOpts.insideTx = true
    gasOpts.startGas = info.gasLeft.toNumber()
    gasOpts.curDomain = curAddress
    gasOpts.prevDepth = curDepth
  }

  if (curDepth !== gasOpts.prevDepth) {
    const gasConsumed = gasOpts.startGas - gasOpts.prevGasLeft
    console.log(gasOpts.curDomain, 'at', gasOpts.prevDepth, '->', curAddress, 'at', curDepth, '- Used', gasConsumed, 'gas')
    // track gas used in previous depth
    if(!!gasOpts.tracking[gasOpts.curDomain]) {
      gasOpts.tracking[gasOpts.curDomain] += gasConsumed
    } else {
      gasOpts.tracking[gasOpts.curDomain] = gasConsumed
    }


    //get name of new current domain address
    gasOpts.startGas = info.gasLeft.toNumber()
    gasOpts.curDomain = curAddress
    gasOpts.prevDepth = curDepth
  }
  gasOpts.prevGasLeft = info.gasLeft.toNumber()


  if (['RETURN', 'REVERT', 'STOP', 'INVALID'].includes(opName)) {
    // end of tx, log the gasUsed 
    if (curDepth === 0) {
      gasOpts.insideTx = false
      console.log('Finished tx!', gasOpts.tracking)
    }
  }  
}
