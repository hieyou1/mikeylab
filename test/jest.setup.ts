beforeAll(() => {
    // @ts-ignore
    delete global.Uint8Array.prototype.toBase64;
    // @ts-ignore
    delete global.Uint8Array.fromBase64;
});