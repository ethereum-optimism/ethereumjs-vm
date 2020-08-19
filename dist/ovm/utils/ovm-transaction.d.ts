/// <reference types="node" />
import VM from '../../index';
import { RunTxResult } from '../../runTx';
export declare const sendOvmTransaction: (vm: VM, calldata: string, from: string | Buffer, to: string | Buffer | undefined) => Promise<RunTxResult>;
