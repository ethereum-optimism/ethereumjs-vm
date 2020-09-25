const makeNullBytes = (length: number): string => {
  return '0x' + '00'.repeat(length)
}

export const NULL_ADDRESS = makeNullBytes(20)
export const NULL_BYTES32 = makeNullBytes(32)
