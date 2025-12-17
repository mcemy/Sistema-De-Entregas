declare module "better-sqlite3" {
  class Database {
    constructor(filename: string, options?: any);
    exec(sql: string): Database;
    pragma(key: string, options?: any): any;
    prepare(sql: string): Statement;
    transaction(fn: (...args: any[]) => any): (...args: any[]) => any;
    close(): void;
  }

  class Statement {
    bind(...params: any[]): Statement;
    step(): any;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    run(...params: any[]): RunResult;
    finalize(): void;
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number;
  }

  export = Database;
}
