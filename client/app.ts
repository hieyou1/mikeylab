/// <reference lib="DOM" />

import { fromBinary, type MessageInitShape } from "@bufbuild/protobuf";
import { get as getIdb, set as setIdb } from "idb-keyval";
import type { HeadersSchema as HeaderInfoSchema } from "./gen/shared/v1/headers_pb";
import { HttpVersion, IpInfoMessageSchema, type IpInfoSchema, TlsVersion } from "./gen/shared/v1/ip_info_pb";
import { ReqInfoMessageSchema } from "./gen/shared/v1/req_info_pb";
import { b64ToBytes } from "./lib/bytes-util";
import { CheckLoop } from "./lib/check-loop";
import { HistoryManager } from "./lib/history-manager";
import type { IIPHandler } from "./lib/i-ip-handler";
import type { MapHelper } from "./map";
import type { ClientToSWMessage } from "./sw-message";
import { IPHandler } from "./lib/ip-handler";

enum RefreshIPReason {
    ACTIVATE = 0,
    OFFLINE = 1,
    CONN_CHANGE = 2,
    CHECK = 3
}

class Mikeylab {
    private static readonly DOM = {
        meta: {
            reqInfo: document.getElementsByTagName("meta").namedItem("x-reqinfo") as HTMLMetaElement
        },
        ipAddr: {
            section: document.querySelector("#ip-addr") as HTMLElement,
            ipv4: document.querySelector("#ipv4-container") as HTMLDivElement,
            ipv6: document.querySelector("#ipv6-container") as HTMLDivElement,
        },
        ipInfo: {
            section: document.querySelector("#ip-info") as HTMLElement,
            asn: document.querySelector("#asn") as HTMLSpanElement,
            asnName: document.querySelector("#asn-name") as HTMLSpanElement,
            timezone: document.querySelector("#timezone") as HTMLSpanElement,
            location: document.querySelector("#location") as HTMLSpanElement,
            map: document.querySelector("#ip-geo-map") as HTMLDivElement,
            colo: document.querySelector("#cf-colo") as HTMLSpanElement,
            httpTlsVersion: document.querySelector("#http-tls-version") as HTMLSpanElement,
            botScore: document.querySelector("#bot-score") as HTMLSpanElement
        },
        request: {
            section: document.querySelector("#request") as HTMLElement,
            browser: document.querySelector("#browser") as HTMLSpanElement,
            privacy: document.querySelector("#privacy") as HTMLSpanElement,
            referer: document.querySelector("#referer") as HTMLSpanElement,
            languages: document.querySelector("#languages") as HTMLSpanElement,
            upgrade: document.querySelector("#https-upgrade") as HTMLSpanElement,
            swActive: document.querySelector("#sw-active") as HTMLSpanElement
        },
        history: {
            list: document.querySelector("#history-list") as HTMLDivElement,
        },
        header: document.querySelector("header") as HTMLElement,
        icons: document.querySelector("#icons-status") as HTMLDivElement
    };

    private static readonly ICONS = {
        "github": "https://github.com/hieyou1",
        "linkedin": "https://linkedin.com/in/mgevarts",
        "email": "mailto:contact@mikeylab.com"
    };

    private static readonly IDB_VERSION_KEY = "v";

    private static readonly PFP_URL = "/pfp.jpg";
    private static readonly FAVICON_URL = "/favicon.png";

    private static MapHelper?: typeof MapHelper;
    private map?: MapHelper;

    live: boolean = true;
    onLine: boolean = navigator.onLine;

    private updateHeaders: boolean = true;

    private curLat?: number;
    private curLng?: number;
    private curColo?: string;

    private readonly iconsElement: HTMLDivElement;

    private iconsShown: boolean = false;
    private importing: boolean = false;
    private swReg: boolean = false;

    private readonly checkLoop: CheckLoop;
    private readonly ipHandler: IIPHandler;
    private readonly historyManager: HistoryManager;

    private static decodeHttpTls(http: HttpVersion, tls: TlsVersion): string {
        let httpTlsVersion = "H";

        switch (http) {
            case HttpVersion.HTTP_VERSION_1_0: {
                httpTlsVersion += "1.0";
                break;
            }
            case HttpVersion.HTTP_VERSION_1_1: {
                httpTlsVersion += "1.1";
                break;
            }
            case HttpVersion.HTTP_VERSION_2: {
                httpTlsVersion += "2";
                break;
            }
            case HttpVersion.HTTP_VERSION_3: {
                httpTlsVersion += "3";
                break;
            }
            default: /* unspecified */ {
                httpTlsVersion += "?";
                break;
            }
        }

        httpTlsVersion += "/T";

        switch (tls) {
            case TlsVersion.TLS_VERSION_1_0: {
                httpTlsVersion += "1.0";
                break;
            }
            case TlsVersion.TLS_VERSION_1_1: {
                httpTlsVersion += "1.1";
                break;
            }
            case TlsVersion.TLS_VERSION_1_2: {
                httpTlsVersion += "1.2";
                break;
            }
            case TlsVersion.TLS_VERSION_1_3: {
                httpTlsVersion += "1.3";
                break;
            }
            default: /* unspecified */ {
                httpTlsVersion += "?";
                break;
            }
        }

        return httpTlsVersion;
    }

    private static genIconsElement(): HTMLDivElement {
        let icons = document.createElement("div");
        icons.classList.add("icons");

        for (let [img, url] of Object.entries(Mikeylab.ICONS)) {
            let a = document.createElement("a");
            a.target = "_blank";
            a.href = url;

            a.innerHTML = `<svg class="bi" viewBox="0 0 32 32"><use xlink:href="dist/icons.svg#${img}"></svg>`;

            icons.appendChild(a);
        }

        return icons;
    }

    private async importMap() {
        if (!this.onLine || this.importing) return;
        this.importing = true;

        // @ts-ignore - webpack will convert the TS extension by itself
        Mikeylab.MapHelper = (await import("./map.ts")).MapHelper;
        this.map = new Mikeylab.MapHelper(Mikeylab.DOM.ipInfo.map);
        if (this.curLat && this.curLng && this.curColo)
            await this.map.genMap(this.curLat, this.curLng, this.curColo);

        this.importing = false;
    }

    private async genMap(lat: number, lng: number, colo: string) {
        if (this.map != null) {
            await this.map.genMap(lat, lng, colo);
            return;
        }
        this.importMap();
        this.curLat = lat;
        this.curLng = lng;
    }

    private parseHeaderInfo(headerInfo: MessageInitShape<typeof HeaderInfoSchema>, first: boolean) {
        let privacy = "";
        if (headerInfo.gpc) {
            privacy = "GPC ";
        }
        if (headerInfo.dnt) {
            privacy += "DNT";
        }
        privacy = privacy.trim();

        Mikeylab.DOM.request.languages.textContent = headerInfo.languages!;
        Mikeylab.DOM.request.privacy.textContent = privacy;
        if (first) Mikeylab.DOM.request.upgrade.textContent = headerInfo.upgrade ? "Yes" : "No";
    }

    async displayInfo(ipInfo: MessageInitShape<typeof IpInfoSchema>) {
        if (ipInfo.ip && ipInfo.ip.value)
            this.ipHandler.setCf(ipInfo.ip.value);

        Mikeylab.DOM.ipInfo.asn.textContent = ipInfo.asn!.toString();
        Mikeylab.DOM.ipInfo.asnName.textContent = (ipInfo.asnName ? " " + ipInfo.asnName : "");
        Mikeylab.DOM.ipInfo.location.textContent = ipInfo.loc + ", " + ipInfo.country;
        Mikeylab.DOM.ipInfo.timezone.textContent = ipInfo.tz!;

        Mikeylab.DOM.ipInfo.botScore.textContent = ipInfo.bot!.toString();
        Mikeylab.DOM.ipInfo.colo.textContent = ipInfo.colo!;
        this.curColo = ipInfo.colo;
        Mikeylab.DOM.ipInfo.httpTlsVersion.textContent = Mikeylab.decodeHttpTls(ipInfo.http!, ipInfo.tls!);

        if (ipInfo.lat && ipInfo.lng) {
            await this.genMap(ipInfo.lat, ipInfo.lng, ipInfo.colo!);
        }

        Mikeylab.DOM.ipInfo.section.classList.remove("loading");
        Mikeylab.DOM.ipInfo.section.classList.add("populated");
    }

    async showStatic() {
        Mikeylab.DOM.icons.innerHTML = "";
        Mikeylab.DOM.icons.appendChild(this.iconsElement);
        this.iconsShown = true;
        Mikeylab.DOM.header.classList.remove("loading");

        const iconElem = document.getElementById("icon") as HTMLLinkElement | null;
        if (iconElem) {
            iconElem.rel = "icon";
            iconElem.href = Mikeylab.FAVICON_URL;
            iconElem.id = "";
        }

        const pfpElem = document.getElementById("pfp") as HTMLImageElement | null;
        if (pfpElem) {
            pfpElem.src = Mikeylab.PFP_URL;
            pfpElem.id = "";
        }
    }

    private blur() {
        if (!this.live) return;

        Mikeylab.DOM.ipAddr.section.classList.add("static");
        Mikeylab.DOM.ipInfo.section.classList.add("static");
        Mikeylab.DOM.request.section.classList.add("static");
    }

    private async refreshIP(reason: RefreshIPReason, preFetch?: MessageInitShape<typeof IpInfoMessageSchema>): Promise<void> {
        if (!this.live) {
            this.checkLoop.stop();
            return;
        }

        const docFocused = document.hasFocus();
        if (!docFocused) this.blur();

        if (reason === RefreshIPReason.CHECK) {
            if (!docFocused) {
                this.checkLoop.stop();
                return;
            }
        } else {
            Mikeylab.DOM.ipInfo.section.classList.remove("populated");
            if (this.iconsShown) {
                Mikeylab.DOM.icons.removeChild(this.iconsElement);
                this.iconsShown = false;
            }
        }

        switch (reason) {
            // @ts-ignore - fall-through case in switch
            case (RefreshIPReason.OFFLINE || RefreshIPReason.CONN_CHANGE): {
                if (this.onLine) {
                    this.historyManager.reset();
                    this.ipHandler.refresh();
                }
            }
            case RefreshIPReason.OFFLINE: {
                Mikeylab.DOM.header.classList.add("offline");
                Mikeylab.DOM.icons.textContent = "Offline";
                this.onLine = false;

                this.checkLoop.start();
                return;
            }
            case RefreshIPReason.ACTIVATE: {
                this.onLine = true;

                Mikeylab.DOM.icons.textContent = "Connecting to server...";

                Mikeylab.DOM.ipAddr.section.classList.remove("static");
                Mikeylab.DOM.ipInfo.section.classList.remove("static");
                Mikeylab.DOM.request.section.classList.remove("static");

                Mikeylab.DOM.header.classList.remove("offline");
                Mikeylab.DOM.header.classList.add("loading");
                Mikeylab.DOM.ipInfo.section.classList.add("loading");

                if (this.swReg) {
                    navigator.serviceWorker.controller?.postMessage({ "type": "sync" } as ClientToSWMessage);
                }

                break;
            }
            default: {
                break;
            }
        }

        let msg = preFetch as MessageInitShape<typeof IpInfoMessageSchema>;

        if (msg == undefined) {
            let res;
            try {
                res = await fetch("/ip-info" + (this.updateHeaders ? "?h" : ""));
            } catch (err) {
                if (err instanceof TypeError) {
                    console.warn("IP refresh failed:", err, "Going offline");
                    return this.refreshIP(RefreshIPReason.OFFLINE);
                } else {
                    throw err;
                }
            }
            msg = fromBinary(IpInfoMessageSchema, new Uint8Array(await res.arrayBuffer()));
            if (!this.onLine) return this.refreshIP(RefreshIPReason.ACTIVATE, msg);
        }

        if (reason === RefreshIPReason.CHECK && this.historyManager.curIpInfo) {
            for (let key of Object.keys(msg.info as object)) {
                if (key.startsWith("$")) continue;
                if ((msg.info as Record<string, any>)[key] != (this.historyManager.curIpInfo as Record<string, any>)[key]) {
                    return this.refreshIP(RefreshIPReason.CONN_CHANGE, msg);
                } else {
                    this.checkLoop.start();
                    return;
                }
            }
        }

        this.updateHeaders = false;

        if (msg.info == null) {
            return;
        }

        if (msg.headers != null) {
            this.parseHeaderInfo(msg.headers, false);
        }

        const ipInfo = msg.info;
        await this.displayInfo(ipInfo);

        this.ipHandler.getIps().then(() => {
            this.historyManager.rtcComplete();
        });

        await this.showStatic();

        await this.historyManager.ipComplete(ipInfo);

        this.checkLoop.start();
    }

    check(activate: boolean = false) {
        this.refreshIP(activate ? RefreshIPReason.ACTIVATE : RefreshIPReason.CHECK);
    }

    private getReqInfo() {
        Mikeylab.DOM.request.section.classList.remove("populated");
        Mikeylab.DOM.request.section.classList.add("loading");

        const bytes = b64ToBytes(Mikeylab.DOM.meta.reqInfo.content);
        const msg = fromBinary(ReqInfoMessageSchema, bytes);

        if (msg.info == null) {
            Mikeylab.DOM.request.section.classList.remove("loading");
            return;
        }
        const reqInfo = msg.info;

        this.parseHeaderInfo(msg.info.headers!, true);
        this.updateHeaders = reqInfo.sw;

        Mikeylab.DOM.request.browser.textContent = reqInfo.browser ?? "Unknown";
        Mikeylab.DOM.request.swActive.textContent = reqInfo.sw ? "Yes" : "No";

        Mikeylab.DOM.request.section.classList.replace("loading", "populated");
    }

    private async registerSW() {
        if (!navigator.onLine) await new Promise((resolve) => window.addEventListener("online", resolve));
        const version = await (await fetch("/meta/version")).text();

        let regs = (await navigator.serviceWorker.getRegistrations());
        if (regs.length > 0) {
            const swReady = await Promise.race([
                navigator.serviceWorker.ready.then(() => true),
                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500))
            ]);

            if (!swReady || !navigator.serviceWorker.controller) {
                let unregPromises = [];
                for (let i of regs) unregPromises.push(i.unregister());
                await Promise.all(unregPromises);
            } else {
                const installedVersion = await getIdb(Mikeylab.IDB_VERSION_KEY);

                if (installedVersion == version) {
                    this.swReg = true;
                    return;
                } else {
                    await setIdb(Mikeylab.IDB_VERSION_KEY, version);
                    (await navigator.serviceWorker.ready).update();
                    window.location.reload();
                    this.swReg = true;
                    return;
                }
            }
        }

        await navigator.serviceWorker.register("./dist/sw.js", {
            "scope": "/"
        });
        await navigator.serviceWorker.ready;

        this.swReg = true;
    }

    async init() {
        this.getReqInfo();
        await this.historyManager.init();
        await this.refreshIP(RefreshIPReason.ACTIVATE);

        window.addEventListener("online", () => {
            this.refreshIP(RefreshIPReason.CHECK);
        });
        window.addEventListener("offline", () => {
            this.refreshIP(RefreshIPReason.CHECK);
        });
        window.addEventListener("blur", () => {
            this.blur();
        });
        window.addEventListener("focus", () => {
            if (!this.live) return;

            Mikeylab.DOM.ipAddr.section.classList.remove("static");
            Mikeylab.DOM.ipInfo.section.classList.remove("static");
            Mikeylab.DOM.request.section.classList.remove("static");

            this.refreshIP(RefreshIPReason.CHECK);
        });
        if ('connection' in navigator) {
            // @ts-ignore - not in TS yet
            navigator.connection.addEventListener("change", () => {
                this.refreshIP(RefreshIPReason.CHECK);
            });
        }

        this.registerSW();
    }

    constructor() {
        this.iconsElement = Mikeylab.genIconsElement();
        this.ipHandler = new IPHandler(Mikeylab.DOM);
        this.historyManager = new HistoryManager(this.ipHandler, this, Mikeylab.DOM);
        this.checkLoop = new CheckLoop(async () => {
            await this.refreshIP(RefreshIPReason.CHECK);
        });
    }
};

let mikeylab = new Mikeylab();
window.onload = () => mikeylab.init();

export type { Mikeylab };
