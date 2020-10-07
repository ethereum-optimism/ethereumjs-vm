export const toHexAddress = (buf: any): string => {
  if (buf.length < 20) {
    throw new Error('Buffer must be at least 20 bytes to be an address.')
  }

  return '0x' + buf.slice(buf.length - 20).toString('hex').padStart(40, '0')
}

export const toHexString = (buf: any): string => {
  return '0x' + buf.toString('hex')
}

export const fromHexString = (str: string): Buffer => {
  return Buffer.from(str.slice(2), 'hex')
}

export const toAddressBuf = (address: string | Buffer): Buffer => {
  return typeof address === 'string' ? fromHexString(address) : address
}
