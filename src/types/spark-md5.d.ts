declare module 'spark-md5' {
  const SparkMD5: {
    hash(content: string, raw?: boolean): string;
    hashBinary(content: string, raw?: boolean): string;
    ArrayBuffer: {
      new(): {
        append(e: any): void;
        end(raw?: boolean): string;
      };
    };
  };
  export default SparkMD5;
}
