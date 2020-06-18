const BN = require('bn.js')
const tape = require('tape')
const Common = require('@ethereumjs/common').default
const util = require('ethereumjs-util')
const VM = require('../../../dist/index').default
const { getPrecompile } = require('../../../dist/evm/precompiles')

tape('Berlin BLS tests', (t) => {
    t.test('G1ADD', async (st) => {
      const BLS_G1ADD_Address = "000000000000000000000000000000000000000a"
      const common = new Common('mainnet', 'berlin')


      // test data: first entry https://raw.githubusercontent.com/matter-labs/eip1962/master/src/test/test_vectors/eip2537/g1_add.csv
      // TODO: add this entire CSV file as a test
      const iput = "0000000000000000000000000000000012196c5a43d69224d8713389285f26b98f86ee910ab3dd668e413738282003cc5b7357af9a7af54bb713d62255e80f560000000000000000000000000000000006ba8102bfbeea4416b710c73e8cce3032c31c6269c44906f8ac4f7874ce99fb17559992486528963884ce429a992fee000000000000000000000000000000000001101098f5c39893765766af4512a0c74e1bb89bc7e6fdf14e3e7337d257cc0f94658179d83320b99f31ff94cd2bac0000000000000000000000000000000003e1a9f9f44ca2cdab4f43a1a3ee3470fdf90b2fc228eb3b709fcd72f014838ac82a6d797aeefed9a0804b22ed1ce8f7"
      const oput = "000000000000000000000000000000001466e1373ae4a7e7ba885c5f0c3ccfa48cdb50661646ac6b779952f466ac9fc92730dcaed9be831cd1f8c4fefffd5209000000000000000000000000000000000c1fb750d2285d4ca0378e1e8cdbf6044151867c34a711b73ae818aee6dbe9e886f53d7928cc6ed9c851e0422f609b11"


      let vm = new VM({ common: common })
      let result = await vm.runCall({
            caller: Buffer.from('0000000000000000000000000000000000000000', 'hex'),
            gasLimit: new BN(0xffffffffff),
            to: Buffer.from(BLS_G1ADD_Address, 'hex'),
            value: new BN(0),
            data: Buffer.from(iput, 'hex')
      })

      st.assert(result.execResult.returnValue.toString('hex') == oput, "BLS G1ADD return value is the expected value")

      // TODO: add a check that gas used is correct.

      st.end()
    })

    // TODO: add tests checking for failures (i.e. input length incorrect; input values not on curve)
  })

