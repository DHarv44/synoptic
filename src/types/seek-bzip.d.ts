declare module 'seek-bzip' {
  const Bunzip: {
    /** Decompress a complete bzip2 stream. */
    decode(input: Uint8Array): Uint8Array
  }
  export default Bunzip
}
