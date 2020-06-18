import BN = require('bn.js')
import { PrecompileInput } from './types'
import { VmErrorResult, ExecResult } from '../evm'
import { ERROR, VmError } from '../../exceptions'
const assert = require('assert')

const mcl = require('mcl-wasm')
let mclInitPromise = mcl.init(mcl.BLS12_381)

export default async function (opts: PrecompileInput): Promise<ExecResult> {
  assert(opts.data)

  await mclInitPromise

  let inputData = opts.data

  let gasUsed = new BN(0) // TODO: add specific gas used to Common

  if (inputData.length != 256) {
    return VmErrorResult(new VmError(ERROR.BLS_12_381_INVALID_INPUT_LENGTH), gasUsed)
  }

  // TODO: move this whole input decoding stuff to an utility file

  // check zero bytes
  const zeroBytes16 = Buffer.alloc(16, 0)
  const zeroByteCheck = [
    [0, 16],
    [64, 80],
    [128, 144],
    [192, 208],
  ]

  for (let index in zeroByteCheck) {
    let slicedBuffer = opts.data.slice(zeroByteCheck[index][0], zeroByteCheck[index][1])
    if (!slicedBuffer.equals(zeroBytes16)) {
      return VmErrorResult(new VmError(ERROR.BLS_12_381_POINT_NOT_ON_CURVE), gasUsed)
    }
  }

  //0000000000000000000000000000000012196c5a43d69224d8713389285f26b98f86ee910ab3dd668e413738282003cc5b7357af9a7af54bb713d62255e80f56
  let p1_x = opts.data.slice(16, 64).toString('hex')
  let p1_y = opts.data.slice(80, 128).toString('hex')
  let p2_x = opts.data.slice(144, 192).toString('hex')
  let p2_y = opts.data.slice(208, 256).toString('hex')

  // build the string to feed into mcl

  let p1str = '1 ' + p1_x + ' ' + p1_y
  let p2str = '1 ' + p2_x + ' ' + p2_y

  let mclPoint1 = new mcl.G1()
  let mclPoint2 = new mcl.G1()

  mclPoint1.setStr(p1str, 16)
  mclPoint2.setStr(p2str, 16)

  let result = mcl.add(mclPoint1, mclPoint2)

  // TODO: figure out if there is a better way to decode these values.
  let decodeStr = result.getStr(16) //1 <x_coord> <y_coord>
  let decoded = decodeStr.match(/"?[0-9a-f]+"?/g) // match above pattern.

  // decoded[0] == 1
  let xval = decoded[1]
  let yval = decoded[2]

  // ensure padding is right.

  if (xval.length % 2 != 0) {
    xval = '0' + xval
  }

  if (yval.length % 2 != 0) {
    yval = '0' + yval
  }

  // convert to buffers.

  let xBuffer = Buffer.concat([Buffer.alloc(64 - xval.length / 2, 0), Buffer.from(xval, 'hex')])

  let yBuffer = Buffer.concat([Buffer.alloc(64 - yval.length / 2, 0), Buffer.from(yval, 'hex')])

  let returnValue = Buffer.concat([xBuffer, yBuffer])

  return {
    gasUsed,
    returnValue: returnValue,
  }
}
