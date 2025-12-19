const PROTOBUF_CONTENT_TYPE = "application/protobuf";

import { create as createPb, MessageInitShape, toBinary } from "@bufbuild/protobuf";
import { env } from "cloudflare:workers";
import createCompress from "compress-brotli";
import { Hono, HonoRequest } from "hono";
import { isbot } from "isbot";
import type { HeadersSchema as HeaderInfoSchema } from "./gen/shared/v1/headers_pb";
import { HttpVersion, type IpInfo, IpInfoMessageSchema, TlsVersion } from "./gen/shared/v1/ip_info_pb";
import { ReqInfoMessageSchema } from "./gen/shared/v1/req_info_pb";
import { b64ToBytes, bytesToB64 } from "./lib/bytes-util";
import type { IataIcao } from "./lib/iata-icao-types";
import { IncorrectQuartetsError, isV4, v4ToInt, v6ToBytes } from "./lib/ip-convert";
import parseUA from "./lib/ua-parse";

let INDEX_HTML: string;
let BOT_SITE: string;
let DEFAULT_REQ_INFO: Uint8Array;
let MLV: string;
let IATA_ICAO: IataIcao;

const app = new Hono();

let inited = false;
const init = async (reqUrl: string) => {
    let url = new URL(reqUrl);
    url.pathname = "index-raw.html";

    INDEX_HTML = await (await env.ASSETS.fetch(url)).text();
    url.pathname = "index-bot.html";
    BOT_SITE = await (await env.ASSETS.fetch(url)).text();
    url.pathname = "/meta/version";
    MLV = await (await env.ASSETS.fetch(url)).text();
    DEFAULT_REQ_INFO = toBinary(ReqInfoMessageSchema, createPb(ReqInfoMessageSchema, { info: {} }));

    let { decompress } = createCompress();

    IATA_ICAO = (await decompress(b64ToBytes((await import("./lib/iata-icao")).IATA_ICAO)));

    inited = true;
};

const getHeaders = (req: HonoRequest): MessageInitShape<typeof HeaderInfoSchema> => {
    return {
        gpc: req.header("Sec-GPC") == "1",
        dnt: req.header("DNT") == "1",
        upgrade: req.header("Upgrade-Insecure-Requests") == "1",
        languages: req.header("Accept-Language")!
    };
};

app.use(async (c, next) => {
    if (!inited)
        await init(c.req.url);
    next();
});

app.get("/", async (c) => {
    c.header("X-Mlv", MLV);
    let info = new Uint8Array(DEFAULT_REQ_INFO.buffer);
    try {
        const ua = c.req.header("User-Agent");

        if (isbot(ua) && c.req.query("nobot") === undefined)
            return c.html(BOT_SITE);

        const parsedUa = ua ? parseUA(ua) : false;
        const browser = parsedUa ? parsedUa[0] + " v" + parsedUa[1] + " on " + parsedUa[2] : undefined;

        c.header("Cache-Control", "no-store");
        info = toBinary(ReqInfoMessageSchema, createPb(ReqInfoMessageSchema, {
            info: {
                browser,
                headers: getHeaders(c.req),
                sw: false
            }
        }));
    } catch (err) {
        console.error("unable to parse ReqInfo: " + err);
    } finally {
        return c.html(INDEX_HTML.replace("$REQINFO", bytesToB64(info)).replace("$ICON", 'id="icon"').replace("$PFP", 'id="pfp"'));
    }
});

app.get("/ip-info", async (c) => {
    try {
        const cf = c.req.raw.cf;
        if (cf == null) throw new Error("No cf object");

        const info = {
            "asn": cf.asn,
            "asnName": cf.asOrganization,
            "country": cf.country,
            "loc": cf.city + ", " + cf.regionCode,
            "tz": cf.timezone,
            "colo": cf.colo,
            "lat": cf.latitude,
            "lng": cf.longitude
        } as IpInfo;

        // #region HTTP & TLS

        switch ((cf.httpProtocol as string).toUpperCase()) {
            case "HTTP/1.0": {
                info.http = HttpVersion.HTTP_VERSION_1_0;
                break;
            }
            case "HTTP/1.1": {
                info.http = HttpVersion.HTTP_VERSION_1_1;
                break;
            }
            case "HTTP/2": {
                info.http = HttpVersion.HTTP_VERSION_2;
                break;
            }
            case "HTTP/3": {
                info.http = HttpVersion.HTTP_VERSION_3;
                break;
            }
            default: {
                info.http = HttpVersion.HTTP_VERSION_UNSPECIFIED;
                break;
            }
        }

        switch ((cf.tlsVersion as string).toUpperCase()) {
            case "TLSv1.0": {
                info.tls = TlsVersion.TLS_VERSION_1_0;
                break;
            }
            case "TLSv1.1": {
                info.tls = TlsVersion.TLS_VERSION_1_1;
                break;
            }
            case "TLSv1.2": {
                info.tls = TlsVersion.TLS_VERSION_1_2;
                break;
            }
            case "TLSv1.3": {
                info.tls = TlsVersion.TLS_VERSION_1_3;
                break;
            }
            default: {
                info.tls = TlsVersion.TLS_VERSION_UNSPECIFIED;
                break;
            }
        }

        // #endregion

        // #region IP

        const ip = c.req.header('x-real-ip');
        if (ip != null) {
            if (isV4(ip)) {
                info.ip.value = v4ToInt(ip);
                info.ip.case = "v4";
            } else {
                try {
                    info.ip.value = v6ToBytes(ip);
                    info.ip.case = "v6";
                } catch (err) {
                    if (!(err instanceof Error))
                        throw err;

                    if (err.name === IncorrectQuartetsError.name) {
                        console.log("Undecodable IPv6: " + ip);
                        console.error(err);
                    } else throw err;
                }
            }
        }

        // #endregion

        let msg = { info } as MessageInitShape<typeof IpInfoMessageSchema>;
        if (c.req.query("h") !== undefined) msg.headers = getHeaders(c.req);

        return c.body(toBinary(IpInfoMessageSchema, createPb(IpInfoMessageSchema, msg)), {
            "headers": {
                "Content-Type": PROTOBUF_CONTENT_TYPE
            }
        });
    } catch (err) {
        console.log("Error on /ip-info! Handling gracefully");
        console.error(err);
        return c.body(toBinary(IpInfoMessageSchema, createPb(IpInfoMessageSchema, {})), {
            "headers": {
                "Content-Type": PROTOBUF_CONTENT_TYPE
            }
        });
    }
});

app.get("/airport", async (c) => {
    const code = c.req.query("code");
    if (!code) return c.json([0, 0]);
    try {
        return c.json(IATA_ICAO[code]);
    } catch (err) {
        return c.json([0, 0]);
    }
});

export default app;