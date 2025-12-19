import { b64ToBytes, bytesToB64 } from "../src/lib/bytes-util.ts";

describe("Bytes to B64", () => {
    it('converts 00', () => {
        const arr = bytesToB64(new Uint8Array([0x00]));
        const expected = "AA==";

        expect(arr).toEqual(expected);
    });

    it('converts 01', () => {
        const arr = bytesToB64(new Uint8Array([0x01]));
        const expected = 'AQ==';

        expect(arr).toEqual(expected);
    });

    it('converts ff', () => {
        const arr = bytesToB64(new Uint8Array([0xff]));
        const expected = '_w==';

        expect(arr).toEqual(expected);
    });

    it('converts random Uint8Array', () => {
        const arr = bytesToB64(new Uint8Array([0, 16, 32, 64, 128, 255]));
        const expected = 'ABAgQID_';

        expect(arr).toEqual(expected);
    });

    it('converts "hi"', () => {
        const arr = bytesToB64(new Uint8Array([104, 105]));
        const expected = 'aGk=';

        expect(arr).toEqual(expected);
    });
});

describe("B64 to Bytes", () => {
    it('converts 00', () => {
        const arr = b64ToBytes('AA==');
        const expected = new Uint8Array([0x00]);

        expect(arr).toEqual(expected);
    });

    it('converts 01', () => {
        const arr = b64ToBytes('AQ==');
        const expected = new Uint8Array([0x01]);

        expect(arr).toEqual(expected);
    });

    it('converts ff', () => {
        const arr = b64ToBytes('_w==');
        const expected = new Uint8Array([0xff]);

        expect(arr).toEqual(expected);
    });

    it('converts random Uint8Array', () => {
        const arr = b64ToBytes('ABAgQID_');
        const expected = new Uint8Array([0, 16, 32, 64, 128, 255]);

        expect(arr).toEqual(expected);
    });

    it('converts "hi"', () => {
        const arr = b64ToBytes('aGk=');
        const expected = new Uint8Array([104, 105]);

        expect(arr).toEqual(expected);
    });
});