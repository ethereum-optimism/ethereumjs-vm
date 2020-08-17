import BN from 'bn.js'

export const toHexString = (buf: Buffer | BN): string => {
  return '0x' + buf.toString('hex')
}

export const fromHexString = (str: string): Buffer => {
  return Buffer.from(str.slice(2), 'hex')
}

export const toAddressBuf = (address: string | Buffer): Buffer => {
  return typeof address === 'string' ? fromHexString(address) : address
}
