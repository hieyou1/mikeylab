// To support types [https://github.com/microsoft/TypeScript/issues/14877]
declare const self: ServiceWorkerGlobalScope;

import { create as createPb, toBinary } from "@bufbuild/protobuf";
import { get as getIdb, set as setIdb } from "idb-keyval";
import { ReqInfoMessageSchema } from "./gen/shared/v1/req_info_pb";
import { bytesToB64 } from "./lib/bytes-util";
import parseUA from "./lib/ua-parse";
import type { ClientToSWMessage } from "./sw-message.js";

class MikeylabSW {
    // #region Constants

    private static readonly PFP_URL = "/pfp.jpg";
    private static readonly FAVICON_URL = "/favicon.png";
    private static readonly IDB_VERSION_KEY = "v";
    private static readonly VERSION_HEADER = "x-mlv";
    private static readonly CACHE_NAME = "mikeylab";
    private static readonly KEEP_HEADERS = [MikeylabSW.VERSION_HEADER, "Content-Type", "Content-Length"].map((val) => val.toLowerCase());

    // #endregion

    // #region Helpers

    private static isIndex(url: URL) {
        return url.pathname == "/" || url.pathname == "/index.html";
    }

    private static getReqInfo(req: Request): string {
        let info = toBinary(ReqInfoMessageSchema, createPb(ReqInfoMessageSchema, { info: {} }));
        try {
            const ua = req.headers.get("User-Agent");
            const parsedUa = ua ? parseUA(ua) : false;
            const browser = parsedUa ? parsedUa[0] + " v" + parsedUa[1] + " on " + parsedUa[2] : undefined;

            info = toBinary(ReqInfoMessageSchema, createPb(ReqInfoMessageSchema, {
                info: {
                    browser,
                    headers: {
                        gpc: req.headers.get("Sec-GPC") == "1",
                        dnt: req.headers.get("DNT") == "1",
                        upgrade: req.headers.get("Upgrade-Insecure-Requests") == "1",
                        languages: req.headers.get("Accept-Language") ?? undefined,
                    },
                    sw: true
                }
            }));
        } catch (err) {
            console.error("unable to parse ReqInfo: " + err);
        } finally {
            return bytesToB64(info);
        }
    }

    private static async parseIndex(req: Request, res: Response, cache: Cache) {
        let indexText = await res.text();
        indexText = indexText.replace("$REQINFO", MikeylabSW.getReqInfo(req));

        if (await cache.match(MikeylabSW.FAVICON_URL))
            indexText = indexText.replace("$ICON", `rel="icon" href="${MikeylabSW.FAVICON_URL}"`);
        else
            indexText = indexText.replace("$ICON", `id="icon"`);

        if (await cache.match(MikeylabSW.PFP_URL))
            indexText = indexText.replace("$PFP", `src="${MikeylabSW.PFP_URL}"`);
        else
            indexText = indexText.replace("$PFP", `id="pfp"`);

        return new Response(indexText, {
            headers: res.headers
        });
    }

    private static filterHeaders(old: Headers): Headers {
        const headers = new Headers();

        for (let i of old.entries()) {
            if (MikeylabSW.KEEP_HEADERS.includes(i[0].toLowerCase())) {
                headers.set(i[0], i[1]);
            }
        }

        return headers;
    }

    private static async store(version: string, url: URL, cache: Cache): Promise<Response> {
        const res = await fetch(url);
        if (!res.headers.has(MikeylabSW.VERSION_HEADER)) return res;
        if (res.headers.get(MikeylabSW.VERSION_HEADER) !== version) {
            await MikeylabSW.sync();
            if (res.headers.get(MikeylabSW.VERSION_HEADER) !== await getIdb(MikeylabSW.IDB_VERSION_KEY))
                return res;
        }

        const storeUrl = new URL(url.origin);
        storeUrl.pathname = url.pathname;

        const storeRes = new Response(await res.arrayBuffer(), {
            headers: MikeylabSW.filterHeaders(res.headers)
        });

        await cache.put(storeUrl, storeRes);

        return await cache.match(storeUrl) as Response;
    }

    // #endregion

    // #region Listeners

    static async sync(version?: string) {
        if (!navigator.onLine) return;

        if (!version) version = await (await fetch("/meta/version")).text();

        await setIdb(MikeylabSW.IDB_VERSION_KEY, version);
    }

    static async claim() {
        await self.clients.claim();
    }

    static async handle(req: Request): Promise<Response | false> {
        if (req.method.toUpperCase() !== "GET") return false;

        const version = await getIdb(MikeylabSW.IDB_VERSION_KEY) as string;

        if (!version) {
            if (navigator.onLine) {
                await MikeylabSW.sync();

                if (await getIdb(MikeylabSW.IDB_VERSION_KEY)) {
                    return await MikeylabSW.handle(req);
                }
            }
            return false;
        }

        const cache = await caches.open(MikeylabSW.CACHE_NAME);

        const url = new URL(req.url);

        const isIndex = MikeylabSW.isIndex(url);
        if (isIndex) url.pathname = "index-raw.html";

        const res = await cache.match(url);

        if (!navigator.onLine) {
            if (!res) return false;

            return (isIndex) ? await MikeylabSW.parseIndex(req, res, cache) : res;
        }

        if (res && res.headers.get(MikeylabSW.VERSION_HEADER) === version) {
            return (isIndex) ? await MikeylabSW.parseIndex(req, res, cache) : res;
        }

        return (isIndex) ? await MikeylabSW.parseIndex(req, await MikeylabSW.store(version, url, cache), cache) : await MikeylabSW.store(version, url, cache);
    }

    static async message(msg: ClientToSWMessage) {
        switch (msg.type) {
            case "sync": {
                await MikeylabSW.sync(msg.version);
                break;
            }

            default: {
                throw new Error("Unrecognized message: " + JSON.stringify(msg));
            }
        }
    }

    // #endregion
}

self.addEventListener("install", (e) => {
    e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
    e.waitUntil(Promise.all(
        [MikeylabSW.claim(), MikeylabSW.sync()]
    ));
});

self.addEventListener("fetch", (e) => {
    e.respondWith((async () => {
        const res = await MikeylabSW.handle(e.request);

        return (res === false) ? await fetch(e.request) : res;
    })());
});

self.addEventListener("message", (e) => {
    e.waitUntil(MikeylabSW.message(e.data));
});