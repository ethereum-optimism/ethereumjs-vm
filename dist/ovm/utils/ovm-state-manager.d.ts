import VM from '../../index';
import Message from '../../evm/message';
export interface OvmStateManagerOpts {
    vm: VM;
}
export declare class OvmStateManager {
    vm: VM;
    private _def;
    private _handlers;
    constructor(opts: OvmStateManagerOpts);
    handleCall(message: Message): Promise<any>;
    associateCodeContract(ovmContractAddress: string, codeContractAddress: string): Promise<void>;
    setStorage(ovmContractAddress: string, slot: string, value: string): Promise<void>;
    getStorage(ovmContractAddress: string, slot: string): Promise<[string]>;
    getStorageView(ovmContractAddress: string, slot: string): Promise<[string]>;
    getOvmContractNonce(ovmContractAddress: string): Promise<[string]>;
    getCodeContractBytecode(ovmContractAddress: string): Promise<[string]>;
    registerCreatedContract(ovmContractAddress: string): Promise<void>;
    incrementOvmContractNonce(ovmContractAddress: string): Promise<void>;
    getCodeContractAddressFromOvmAddress(ovmContractAddress: string): Promise<[string]>;
}
