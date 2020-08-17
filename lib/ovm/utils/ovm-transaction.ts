/* External Imports */
import { Transaction } from 'ethereumjs-tx'

/* Internal Imports */
import VM from '../../index'
import { RunTxResult } from '../../runTx'

export const sendOvmTransaction = (
  vm: VM,
  calldata: string,
  from: string | Buffer,
  to: string | Buffer | undefined
): Promise<RunTxResult> => {
  // TODO: Make sure these constants are configurable.
  const tx = new Transaction({
    nonce: 0,
    gasPrice: 0,
    gasLimit: 5_000_000,
    to: to,
    data: calldata
  })
  ;(tx as any)['_from' as any] = from

  return vm.runTx({
    tx: tx,
    skipBalance: true,
    skipNonce: true,
    skipExecutionManager: true
  })
}