export declare class Logger {
    private _namespace;
    private _debugger;
    constructor(namespace: string);
    log(message: string): void;
    scope(namespace: string, section?: string): ScopedLogger;
}
export declare class ScopedLogger extends Logger {
    private _section;
    constructor(namespace: string, section?: string);
    open(): void;
    close(): void;
    private _logSection;
}
