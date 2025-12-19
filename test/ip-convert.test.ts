import { v4ToInt, intToV4, v6ToBytes, bytesToV6, isV4 } from "../src/lib/ip-convert";

describe("IP Detector", () => {
    it('detects 2001:db8::1 as v6', () => {
        const ip = '2001:db8::1';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 1111:2222:3333::1000:ffee:1 as v6', () => {
        const ip = '1111:2222:3333::1000:ffee:1';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 1:2:3::1023:0:22 as v6', () => {
        const ip = '1:2:3::1023:0:22';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects ffee:0:0:1::1 as v6', () => {
        const ip = 'ffee:0:0:1::1';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 1a2b::2 as v6', () => {
        const ip = '1a2b::2';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects fe00:0:0:1::92 as v6', () => {
        const ip = 'fe00:0:0:1::92';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 2001:db8:85a3::8a2e:370:7334 as v6', () => {
        const ip = '2001:db8:85a3::8a2e:370:7334';
        const expected = false;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 127.0.0.1 as v4', () => {
        const ip = '127.0.0.1';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 1.1.1.1 as v4', () => {
        const ip = '1.1.1.1';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 1.0.0.1 as v4', () => {
        const ip = '1.0.0.1';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 0.0.0.0 as v4', () => {
        const ip = '0.0.0.0';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 255.255.255.255 as v4', () => {
        const ip = '255.255.255.255';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 2.134.213.2 as v4', () => {
        const ip = '2.134.213.2';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });

    it('detects 135.58.24.17 as v4', () => {
        const ip = '135.58.24.17';
        const expected = true;

        expect(isV4(ip)).toEqual(expected);
    });
});

describe('IPv6 to Uint8Array', () => {
    it('converts 2001:db8::1', () => {
        const ipv6 = "2001:db8::1";
        const expected = new Uint8Array([0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });

    it('converts 1111:2222:3333::1000:ffee:1', () => {
        const ipv6 = "1111:2222:3333::1000:ffee:1";
        const expected = new Uint8Array([0x11, 0x11, 0x22, 0x22, 0x33, 0x33, 0, 0, 0, 0, 0x10, 0, 0xff, 0xee, 0, 0x01]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });

    it('converts 1:2:3::1023:0:22', () => {
        const ipv6 = "1:2:3::1023:0:22";
        const expected = new Uint8Array([0, 0x01, 0, 0x02, 0, 0x03, 0, 0, 0, 0, 0x10, 0x23, 0, 0, 0, 0x22]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });

    it('converts ffee:0:0:1::1', () => {
        const ipv6 = "ffee:0:0:1::1";
        const expected = new Uint8Array([0xff, 0xee, 0, 0, 0, 0, 0, 0x01, 0, 0, 0, 0, 0, 0, 0, 0x01]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });

    it('converts 1a2b::2', () => {
        const ipv6 = "1a2b::2";
        const expected = new Uint8Array([0x1a, 0x2b, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x02]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });

    it('converts fe00:0:0:1::92', () => {
        const ipv6 = "fe00:0:0:1::92";
        const expected = new Uint8Array([0xfe, 0, 0, 0, 0, 0, 0, 0x01, 0, 0, 0, 0, 0, 0, 0, 0x92]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });

    it('converts 2001:db8:85a3::8a2e:370:7334', () => {
        const ipv6 = "2001:db8:85a3::8a2e:370:7334";
        const expected = new Uint8Array([0x20, 0x01, 0x0d, 0xb8, 0x85, 0xa3, 0, 0, 0, 0, 0x8a, 0x2e, 0x03, 0x70, 0x73, 0x34]);

        expect(v6ToBytes(ipv6)).toEqual(expected);
    });
});

describe('Uint8Array to IPv6', () => {
    it('converts 2001:db8::1', () => {
        const bytes = new Uint8Array([0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
        const expected = "2001:db8::1";

        expect(bytesToV6(bytes)).toEqual(expected);
    });

    it('converts 1111:2222:3333::1000:ffee:1', () => {
        const bytes = new Uint8Array([0x11, 0x11, 0x22, 0x22, 0x33, 0x33, 0, 0, 0, 0, 0x10, 0, 0xff, 0xee, 0, 0x01]);
        const expected = "1111:2222:3333::1000:ffee:1";

        expect(bytesToV6(bytes)).toEqual(expected);
    });

    it('converts 1:2:3::1023:0:22', () => {
        const bytes = new Uint8Array([0, 0x01, 0, 0x02, 0, 0x03, 0, 0, 0, 0, 0x10, 0x23, 0, 0, 0, 0x22]);
        const expected = "1:2:3::1023:0:22";

        expect(bytesToV6(bytes)).toEqual(expected);
    });

    it('converts ffee:0:0:1::1', () => {
        const bytes = new Uint8Array([0xff, 0xee, 0, 0, 0, 0, 0, 0x01, 0, 0, 0, 0, 0, 0, 0, 0x01]);
        const expected = "ffee:0:0:1::1";

        expect(bytesToV6(bytes)).toEqual(expected);
    });

    it('converts 1a2b::2', () => {
        const bytes = new Uint8Array([0x1a, 0x2b, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x02]);
        const expected = "1a2b::2";

        expect(bytesToV6(bytes)).toEqual(expected);
    });

    it('converts fe00:0:0:1::92', () => {
        const bytes = new Uint8Array([0xfe, 0, 0, 0, 0, 0, 0, 0x01, 0, 0, 0, 0, 0, 0, 0, 0x92]);
        const expected = "fe00:0:0:1::92";

        expect(bytesToV6(bytes)).toEqual(expected);
    });

    it('converts 2001:db8:85a3::8a2e:370:7334', () => {
        const bytes = new Uint8Array([0x20, 0x01, 0x0d, 0xb8, 0x85, 0xa3, 0, 0, 0, 0, 0x8a, 0x2e, 0x03, 0x70, 0x73, 0x34]);
        const expected = "2001:db8:85a3::8a2e:370:7334";

        expect(bytesToV6(bytes)).toEqual(expected);
    });
});

describe('IPv4 to Integer', () => {
    it('converts 127.0.0.1', () => {
        const ipv4 = "127.0.0.1";
        const expected = 2130706433;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });

    it('converts 1.1.1.1', () => {
        const ipv4 = "1.1.1.1";
        const expected = 16843009;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });

    it('converts 1.0.0.1', () => {
        const ipv4 = "1.0.0.1";
        const expected = 16777217;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });

    it('converts 0.0.0.0', () => {
        const ipv4 = "0.0.0.0";
        const expected = 0;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });

    it('converts 255.255.255.255', () => {
        const ipv4 = "255.255.255.255";
        const expected = 4294967295;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });

    it('converts 2.134.213.2', () => {
        const ipv4 = "2.134.213.2";
        const expected = 42390786;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });

    it('converts 135.58.24.17', () => {
        const ipv4 = "135.58.24.17";
        const expected = 2268731409;

        expect(v4ToInt(ipv4)).toEqual(expected);
    });
});

describe('Integer to IPv4', () => {
    it('converts 127.0.0.1', () => {
        const int = 2130706433;
        const expected = "127.0.0.1";

        expect(intToV4(int)).toEqual(expected);
    });

    it('converts 1.1.1.1', () => {
        const int = 16843009;
        const expected = "1.1.1.1";

        expect(intToV4(int)).toEqual(expected);
    });

    it('converts 1.0.0.1', () => {
        const int = 16777217;
        const expected = "1.0.0.1";

        expect(intToV4(int)).toEqual(expected);
    });

    it('converts 0.0.0.0', () => {
        const int = 0;
        const expected = "0.0.0.0";

        expect(intToV4(int)).toEqual(expected);
    });

    it('converts 255.255.255.255', () => {
        const int = 4294967295;
        const expected = "255.255.255.255";

        expect(intToV4(int)).toEqual(expected);
    });

    it('converts 2.134.213.2', () => {
        const int = 42390786;
        const expected = "2.134.213.2";

        expect(intToV4(int)).toEqual(expected);
    });

    it('converts 135.58.24.17', () => {
        const int = 2268731409;
        const expected = "135.58.24.17";

        expect(intToV4(int)).toEqual(expected);
    });
});