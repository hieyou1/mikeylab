// #region detector

export function isV4(ip: string): boolean {
    return !ip.includes(":") && ip.includes(".");
}

// #endregion

// #region v4

export function intToV4(int: number): string {
    return (
        (int >>> 24) + '.' +
        (int >>> 16 & 255) + '.' +
        (int >>> 8 & 255) + '.' +
        (int & 255)
    );
}

export function v4ToInt(ip: string): number {
    return ip.split('.').reduce((int, octet) => int * 256 + parseInt(octet, 10), 0);
}

// #endregion

// #region v6

export class IncorrectQuartetsError extends Error {
    readonly ip: string;
    readonly byte?: number;

    constructor(ip: string, byte?: number) {
        if (byte) {
            super("Quartets incorrect for " + ip + "at byte " + byte);
        } else {
            super("Quartets incorrect for " + ip);
        }
        this.name = "IncorrectQuartetsError";
        this.ip = ip;
        this.byte = byte;
    }
}

export function v6ToBytes(ip: string): Uint8Array {
    let quartets = ip.split(":");

    // pad & parse out double colon
    let doubleColon = -1;
    for (let i in quartets) {
        if (quartets[i] === "") {
            doubleColon = parseInt(i);
        } else {
            quartets[i] = quartets[i]!.padStart(4, "0");
        }
    }
    if (doubleColon !== -1) {
        const zeroQuartets = 9 - quartets.length;

        let newQuartets = [];
        for (let i = 0; i < doubleColon; ++i) {
            newQuartets.push(quartets[i]!);
        }
        for (let i = 0; i < zeroQuartets; ++i) {
            newQuartets.push("0000");
        }
        for (let i = doubleColon + 1; i < quartets.length; ++i) {
            newQuartets.push(quartets[i]!);
        }
        quartets = newQuartets;
    }

    // ensure that everything is good so far, otherwise throw
    if (quartets.length !== 8) {
        throw new IncorrectQuartetsError(ip);
    }

    // convert to Uint8Array
    let bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i = i + 2) {
        const quartet = quartets[i / 2]!;

        let byte1;
        try {
            byte1 = parseInt(quartet.charAt(0) + quartet.charAt(1), 16);
        } catch (err) {
            throw new IncorrectQuartetsError(ip, i);
        }
        bytes[i] = byte1;

        let byte2;
        try {
            byte2 = parseInt(quartet.charAt(2) + quartet.charAt(3), 16);
        } catch (err) {
            throw new IncorrectQuartetsError(ip, i + 1);
        }
        bytes[i + 1] = byte2;
    }

    return bytes;
}

export function bytesToV6(bytes: Uint8Array): string {
    let quartets: string[] = [];
    let zeroQuartets: number[] = [];

    // make quartets
    for (let i = 0; i < 16; i = i + 2) {
        let quartet = (bytes[i] as number).toString(16).padStart(2, "0") + (bytes[i + 1] as number).toString(16).padStart(2, "0");
        quartets.push(quartet);

        if (quartet == "0000") {
            zeroQuartets.push(i / 2);
        }
    }

    // double-colon
    let maxZeroStart, curZeroStart;
    let maxZeroLen = -1;
    let curZero = -1;
    let curZeroLen = -2;
    for (let i in zeroQuartets) {
        let zq = zeroQuartets[i] as number;

        if (zq === curZero + 1) {
            curZero = zq;
            ++curZeroLen;
        } else {
            curZero = zq;
            curZeroStart = zq;
            curZeroLen = 1;
        }

        if (curZeroLen >= maxZeroLen) {
            maxZeroLen = curZeroLen;
            maxZeroStart = curZeroStart;
        }
    }
    if (maxZeroLen > 1) {
        quartets.splice(maxZeroStart as number, maxZeroLen, "");
    }

    // quartet shortening
    quartets = quartets.map((val) => {
        let i = 0, start = 0;
        while (val[i++] == "0" && i < val.length) ++start;
        return val.substring(start);
    })

    return quartets.join(":");
}

// #endregion