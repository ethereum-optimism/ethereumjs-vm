# SYNOPSIS

[![NPM Package](https://img.shields.io/npm/v/ethereumjs-vm.svg?style=flat-square)](https://www.npmjs.org/package/ethereumjs-vm)
[![Actions Status](https://github.com/ethereumjs/ethereumjs-vm/workflows/vm-test/badge.svg)](https://github.com/ethereumjs/ethereumjs-vm/actions)
[![Code Coverage](https://codecov.io/gh/ethereumjs/ethereumjs-vm/branch/master/graph/badge.svg)](https://codecov.io/gh/ethereumjs/ethereumjs-vm)
[![Gitter](https://img.shields.io/gitter/room/ethereum/ethereumjs.svg?style=flat-square)](https://gitter.im/ethereum/ethereumjs)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Implements Optimism's OVM in Javascript. Forked with <3 from `ethereumjs-vm`!

# Logging

This fork provides some custom logging tools for introspecting the OVM. Particularly, the environment variable `DEBUG_OVM=true` will allow you to log various degrees of internal EVM execution such as calls, stack, and memory.

## Namespaces

The logger uses npm `debug` package, and prints EVM steps according to the following format:

- `ethjs-ovm:evm:<addr>...:d<DEPTH>` for `CALL`s, `REVERT`s, and `RETURN`s
- `ethjs-ovm:evm:<addr>...:d<DEPTH>:steps` for individual EVM steps (opcodes and stack)
- `ethjs-ovm:evm:<addr>...:d<DEPTH>:memory` for memory (only logs on steps where memory is updated)

Where:

- `<addr>` is either:
  - The first four bytes of the code contract address, or
  - `exe-mgr`, `state-mgr`, `addr-rslvr`, or `safety-chkr`, if the steps correspond to OVM container execution.
- `<DEPTH>` is the current EVM call depth of the transaction.

## Usage

`debug` can filter these namespaces to suit your loggin needs. The most common two patterns are:

- One where all code contract opcodes are logged, but only `CALL`s and `RETURN` data is logged for container contracts: `export DEBUG="ethjs-ovm:evm*,-ethjs-ovm:evm:*:memory,-*exe-mgr:steps,-*exe-mgr:memory,-*state-mgr*,-*addr-rslvr*,-*safety-chkr*" # hide code contract memory and container steps`
- One where modifications to code contract memory are also logged: `export DEBUG="ethjs-ovm:evm*,-*exe-mgr:steps,-*exe-mgr:memory,-*state-mgr*,-*addr-rslvr*,-*safety-chkr*" #print mem`

# USAGE

```javascript
const BN = require('bn.js')
var VM = require('ethereumjs-vm').default

// Create a new VM instance
// For explicity setting the HF use e.g. `new VM({ hardfork: 'petersburg' })`
const vm = new VM()

const STOP = '00'
const ADD = '01'
const PUSH1 = '60'

// Note that numbers added are hex values, so '20' would be '32' as decimal e.g.
const code = [PUSH1, '03', PUSH1, '05', ADD, STOP]

vm.on('step', function(data) {
  console.log(`Opcode: ${data.opcode.name}\tStack: ${data.stack}`)
})

vm.runCode({
  code: Buffer.from(code.join(''), 'hex'),
  gasLimit: new BN(0xffff),
})
  .then(results => {
    console.log('Returned : ' + results.returnValue.toString('hex'))
    console.log('gasUsed  : ' + results.gasUsed.toString())
  })
  .catch(err => console.log('Error    : ' + err))
```

## Example

This projects contain the following examples:

1. [./examples/run-blockchain](./examples/run-blockchain): Loads tests data, including accounts and blocks, and runs all of them in the VM.
1. [./examples/run-code-browser](./examples/run-code-browser): Show how to use this library in a browser.
1. [./examples/run-solidity-contract](./examples/run-solidity-contract): Compiles a Solidity contract, and calls constant and non-constant functions.
1. [./examples/run-transactions-complete](./examples/run-transactions-complete): Runs a contract-deployment transaction and then calls one of its functions.
1. [./examples/decode-opcodes](./examples/decode-opcodes): Decodes a binary EVM program into its opcodes.

All of the examples have their own `README.md` explaining how to run them.

# BROWSER

To build the VM for standalone use in the browser, see: [Running the VM in a browser](https://github.com/ethereumjs/ethereumjs-vm/tree/master/examples/run-code-browser).

# API

## VM

For documentation on `VM` instantiation, exposed API and emitted `events` see generated [API docs](./docs/README.md).

## StateManger

The API for the `StateManager` is currently in `Beta`, separate documentation can be found [here](./docs/classes/statemanager.md), see also [release notes](https://github.com/ethereumjs/ethereumjs-vm/releases/tag/v2.5.0) from the `v2.5.0` VM release for details on the `StateManager` rewrite.

# Internal Structure

The VM processes state changes at many levels.

- **runBlockchain**
  - for every block, runBlock
- **runBlock**
  - for every tx, runTx
  - pay miner and uncles
- **runTx**
  - check sender balance
  - check sender nonce
  - runCall
  - transfer gas charges
- **runCall**
  - checkpoint state
  - transfer value
  - load code
  - runCode
  - materialize created contracts
  - revert or commit checkpoint
- **runCode**
  - iterate over code
  - run op codes
  - track gas usage
- **OpFns**
  - run individual op code
  - modify stack
  - modify memory
  - calculate fee

The opFns for `CREATE`, `CALL`, and `CALLCODE` call back up to `runCall`.

## VM's tracing events

You can subscribe to the following events of the VM:

- `beforeBlock`: Emits a `Block` right before running it.
- `afterBlock`: Emits `RunBlockResult` right after running a block.
- `beforeTx`: Emits a `Transaction` right before running it.
- `afterTx`: Emits a `RunTxResult` right after running a transaction.
- `beforeMessage`: Emits a `Message` right after running it.
- `afterMessage`: Emits an `EVMResult` right after running a message.
- `step`: Emits an `InterpreterStep` right before running an EVM step.
- `newContract`: Emits a `NewContractEvent` right before creating a contract. This event contains the deployment code, not the deployed code, as the creation message may not return such a code.

### Asynchronous event handlers

You can perform asynchronous operations from within an event handler
and prevent the VM to keep running until they finish.

In order to do that, your event handler has to accept two arguments.
The first one will be the event object, and the second one a function.
The VM won't continue until you call this function.

If an exception is passed to that function, or thrown from within the
handler or a function called by it, the exception will bubble into the
VM and interrupt it, possibly corrupting its state. It's strongly
recommended not to do that.

### Synchronous event handlers

If you want to perform synchronous operations, you don't need
to receive a function as the handler's second argument, nor call it.

Note that if your event handler receives multiple arguments, the second
one will be the continuation function, and it must be called.

If an exception is thrown from withing the handler or a function called
by it, the exception will bubble into the VM and interrupt it, possibly
corrupting its state. It's strongly recommended not to throw from withing
event handlers.

# DEVELOPMENT

Developer documentation - currently mainly with information on testing and debugging - can be found [here](./developer.md).

# EthereumJS

See our organizational [documentation](https://ethereumjs.readthedocs.io) for an introduction to `EthereumJS` as well as information on current standards and best practices.

If you want to join for work or do improvements on the libraries have a look at our [contribution guidelines](https://ethereumjs.readthedocs.io/en/latest/contributing.html).

# LICENSE

[MPL-2.0](https://www.mozilla.org/MPL/2.0/)
