// @ts-check

import { readFile, writeFile } from "fs/promises";
import { brotliCompress } from "zlib";
import { promisify } from "util";

/**
 * @type {import("./lib/iata-icao-types.d.ts").IataIcao}
 */
let airport = {};
let first = true;

for (let line of (await readFile("iata-icao.csv", "utf8")).split("\n")) {
    if (first) {
        first = false;
        continue;
    }

    let [_a, _b, _c, iata, _d, name, lat, lng] = line.split('"').filter((v) => v != ",");

    if (!iata || !name || !lat || !lng) {
        continue;
    }

    airport[iata] = [
        parseFloat(lat),
        parseFloat(lng)
    ];
}

let brotli = await promisify(brotliCompress)(Buffer.from(JSON.stringify(airport)));
await writeFile("./lib/iata-icao.ts", `export const IATA_ICAO = "${brotli.toString("base64url")}";`);