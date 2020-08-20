/// <reference types="node" />
import VM from '../../index';
interface EthStorageProof {
    key: string;
    value: string;
    proof: string[];
}
export interface EthTrieProof {
    balance: string;
    nonce: string;
    storageHash: string;
    codeHash: string;
    stateRoot: string;
    accountProof: string[];
    storageProof: EthStorageProof[];
}
/**
 * Returns a trie proof in the format of EIP-1186.
 * @param vm VM to generate the proof from.
 * @param address Address to generate the proof for.
 * @param slots Slots to get proofs for.
 * @returns A proof object in the format of EIP-1186.
 */
export declare const getEthTrieProof: (vm: VM, address: Buffer, slots?: Buffer[]) => Promise<EthTrieProof>;
export {};
