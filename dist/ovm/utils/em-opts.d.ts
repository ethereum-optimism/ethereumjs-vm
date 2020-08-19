export interface EMOpts {
    ovmTxBaseGasFee: number;
    ovmTxMaxGas: number;
    gasRateLimitEpochSeconds: number;
    maxSequencedGasPerEpoch: number;
    maxQueuedGasPerEpoch: number;
}
export declare const defaultEmOpts: EMOpts;
