declare module 'dbffile' {
  export class DBFFile {
    static open(path: string): Promise<DBFFile>;
    readRecords(): Promise<Record<string, unknown>[]>;
    close(): Promise<void>;
  }
} 