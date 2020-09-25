import debug, { Debugger } from 'debug'
import { v4 as uuidv4 } from 'uuid'

export class Logger {
  private _namespace: string
  private _debugger: Debugger
  private _section: string | undefined

  constructor(namespace: string) {
    this._namespace = namespace
    this._debugger = debug(namespace)
  }

  log(message: string): void {
    this._debugger(message)
  }

  scope(namespace: string, id?: string): Logger {
    return new Logger(`${this._namespace}:${namespace}:${id || uuidv4()}`)
  }

  get enabled(): boolean {
    return this._debugger.enabled
  }

  get namespace(): string {
    return this._namespace
  }

  logSection(message: string): void {
    this.log(`------${'-'.repeat(message.length)}------`)
    this.log(`----- ${message} -----`)
    this.log(`------${'-'.repeat(message.length)}------`)
  }

  open(message: string): void {
    this._section = message
    this.logSection(`BEGIN: ${this._section}`)
  }

  close(): void {
    if (!this._section) {
      return
    }

    this.logSection(`END  : ${this._section}`)
  }
}
