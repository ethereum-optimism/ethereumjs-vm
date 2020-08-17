import debug, { Debugger } from 'debug'
import { v4 as uuidv4 } from 'uuid'

export class Logger {
  private _namespace: string
  private _debugger: Debugger

  constructor(namespace: string) {
    this._namespace = namespace
    this._debugger = debug(namespace)
  }

  log(message: string): void {
    this._debugger(message)
  }

  scope(namespace: string, section?: string): ScopedLogger {
    const id = uuidv4()
    return new ScopedLogger(`${this._namespace}:${namespace}:${id}`, section)
  }
}

export class ScopedLogger extends Logger {
  private _section: string

  constructor(namespace: string, section?: string) {
    super(namespace)

    this._section = section || namespace
  }

  open(): void {
    const sectionStartMessage = `BEGIN: ${this._section}`

    this.log(`\n\n`)
    this._logSection(sectionStartMessage)
    this.log(`\n`)
  }

  close(): void {
    const sectionEndMessage = `END: ${this._section}`

    this.log(`\n`)
    this._logSection(sectionEndMessage)
    this.log(`\n\n`)
  }

  private _logSection(message: string): void {
    this.log(`------${'-'.repeat(message.length)}------`)
    this.log(`----- ${message} -----`)
    this.log(`------${'-'.repeat(message.length)}------`)
  }
}