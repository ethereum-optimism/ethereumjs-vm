/// <reference types="node" />
import { Interface } from '@ethersproject/abi';
import VM from '../../index';
export interface OVMContractOpts {
    vm: VM;
    iface: Interface;
    name: string;
    address?: Buffer;
    bytecode?: string;
}
export declare class OVMContract {
    vm: VM;
    iface: Interface;
    name: string;
    address?: Buffer;
    bytecode?: string;
    constructor(opts: OVMContractOpts);
    get addressHex(): string;
    deploy(constructorArgs?: any[]): Promise<void>;
    sendTransaction(functionName: string, functionArgs?: any[]): Promise<any>;
    decodeFunctionData(data: Buffer): {
        functionName: string;
        functionArgs: any[];
    };
}
