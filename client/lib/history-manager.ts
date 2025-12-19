import { create as createPb, fromBinary, type MessageInitShape, toBinary } from "@bufbuild/protobuf";
import { get as getIdb, set as setIdb } from "idb-keyval";
import type { Mikeylab } from "../app";
import { type IpInfoRepr, IpInfoReprSchema, IpInfoStoredSchema } from "../gen/client/v1/ip_info_stored_pb";
import type { IpInfoSchema } from "../gen/shared/v1/ip_info_pb";
import { b64ToBytes, bytesToB64 } from "./bytes-util";
import { IIPHandler } from "./i-ip-handler";
import { bytesToV6, intToV4 } from "./ip-convert";

export class HistoryManager {
    private readonly ipHandler: IIPHandler;
    private readonly DOM: {
        ipAddr: {
            section: HTMLElement,
        },
        ipInfo: {
            section: HTMLElement,
        },
        request: {
            section: HTMLElement,
        },
        history: {
            list: HTMLDivElement,
        },
    };

    curIpInfo?: MessageInitShape<typeof IpInfoSchema>;

    private ipCompleted: boolean;
    private rtcCompleted: boolean;
    private saved: boolean;
    private lockFavs: boolean = false;

    private mikeylab: Mikeylab;

    private static readonly MAX_NON_FAVORITES = 10;

    private static readonly IDB_HISTORY_KEY = "h";
    private static readonly IDB_FAVORITE_KEY = "f";
    private static readonly IDB_INCR_KEY = "i";

    private static readonly LIVE_ENTRY_ID = "live";

    private static genUse(filledIn: boolean): string {
        return `<use xlink:href="dist/icons.svg#star${filledIn ? "-fill" : ""}"></use>`;
    }

    private static makeFavorite(filledIn: boolean): SVGSVGElement {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("viewBox", "0 0 16 16");
        svg.innerHTML = HistoryManager.genUse(filledIn);
        return svg;
    }

    private static checkIdentical(one: MessageInitShape<typeof IpInfoReprSchema>, two: MessageInitShape<typeof IpInfoReprSchema>, checkAddresses: boolean): boolean {
        if (!one || !one.info || !one.addresses || !two || !two.info || !two.addresses || !one.addresses.ipv4 || !two.addresses.ipv4 || !one.addresses.ipv6 || !two.addresses.ipv6 || one.addresses.ipv4.length != two.addresses.ipv4.length || one.addresses.ipv6.length != two.addresses.ipv6.length) return false;

        for (let key of Object.keys(one.info)) {
            if (key.startsWith("$")) continue;
            if (key == "ip") {
                if ((!one.info.ip && two.info.ip) || (!two.info.ip && one.info.ip)) return false;
                if (one.info.ip && two.info.ip) {
                    if ((one.info.ip.value && !two.info.ip.value) || (!one.info.ip.value && two.info.ip.value)) return false;
                    if (one.info.ip.case != two.info.ip.case) return false;
                    if (!one.info.ip.value || !two.info.ip.value) {
                        continue;
                    }
                    if (one.info.ip.case == "v4") {
                        if (one.info.ip.value != two.info.ip.value) return false;
                    } else if (one.info.ip.case == "v6") {
                        if (bytesToB64(one.info.ip.value) != bytesToB64(two.info.ip.value as Uint8Array)) return false;
                    }
                }
                continue;
            }
            if ((one.info as Record<string, any>)[key] != (two.info as Record<string, any>)[key]) {
                return false;
            }
        }

        if (checkAddresses) {
            for (let i in one.addresses.ipv4) {
                if (one.addresses.ipv4[i as unknown as number] != two.addresses.ipv4[i as unknown as number]) {
                    return false;
                }
            }

            for (let i in one.addresses.ipv6) {
                if (bytesToB64(one.addresses.ipv6[i as unknown as number]!) != bytesToB64(two.addresses.ipv6[i as unknown as number]!)) {
                    return false;
                }
            }
        }

        return true;
    }

    private static prependChild(parentElement: HTMLElement, childElement: HTMLElement) {
        if (parentElement.childElementCount > 0) {
            parentElement.insertBefore(childElement, parentElement.children[0]!);
        } else {
            parentElement.appendChild(childElement);
        }
    }

    private static genName(info: MessageInitShape<typeof IpInfoStoredSchema>): HTMLSpanElement {
        const connName = document.createElement("span");

        const date = document.createElement("span");
        date.classList.add("date");
        date.textContent = new Date(parseInt(info.date!.toString())).toLocaleString();
        connName.appendChild(date);

        const otherInfo = document.createElement("span");
        otherInfo.classList.add("other-info");
        otherInfo.textContent = ": ";
        if (info.repr && info.repr.info) {
            if (info.repr.info.ip && info.repr.info.ip.case && info.repr.info.ip.value) {
                switch (info.repr.info.ip.case) {
                    case "v4": {
                        otherInfo.textContent += intToV4(info.repr.info.ip.value);
                        break;
                    }
                    case "v6": {
                        otherInfo.textContent += bytesToV6(info.repr.info.ip.value);
                        break;
                    }
                    default: {
                        break;
                    }
                }
                otherInfo.textContent += " @ ";
            } else if (info.repr.addresses?.ipv4 && info.repr.addresses.ipv4.length > 0) {
                otherInfo.textContent += intToV4(info.repr.addresses.ipv4[0]!) + " @ ";
            } else if (info.repr.addresses?.ipv6 && info.repr.addresses.ipv6.length > 0) {
                otherInfo.textContent += bytesToV6(info.repr.addresses.ipv6[0]!) + " @ ";
            } else if (info.repr.info.colo) {
                otherInfo.textContent += `CF-${info.repr.info.colo} @ `;
            }

            if (info.repr.info.asnName) {
                otherInfo.textContent += info.repr.info.asnName;
            } else if (info.repr.info.asn) {
                otherInfo.textContent += `ASN ${info.repr.info.asn}`;
            }
        }
        connName.appendChild(otherInfo);

        return connName;
    }

    private static async incrKey(): Promise<number> {
        let i = (await getIdb(HistoryManager.IDB_INCR_KEY) ?? -1) + 1;
        await setIdb(HistoryManager.IDB_INCR_KEY, i);
        return i;
    }

    private deactivate() {
        document.querySelectorAll("a.entry.active").forEach((i) => i.classList.remove("active"));
    }

    reset() {
        this.curIpInfo = undefined;
        this.saved = false;
    }

    private genLive(): HTMLAnchorElement {
        const liveEntry = document.createElement("a");
        liveEntry.classList.add("entry");
        liveEntry.href = "#live";
        liveEntry.id = HistoryManager.LIVE_ENTRY_ID;

        const connName = document.createElement("span");
        connName.textContent = "See your live connection";
        liveEntry.appendChild(connName);

        liveEntry.onclick = () => {
            this.deactivate();
            this.mikeylab.live = true;
            this.ipHandler.refresh();
            this.reset();
            this.mikeylab.check(true);
            liveEntry.parentElement!.removeChild(liveEntry);
        };

        HistoryManager.prependChild(this.DOM.history.list, liveEntry);

        return liveEntry;
    }

    private async loadItem(b64: string, highlight?: HTMLAnchorElement) {
        let item: MessageInitShape<typeof IpInfoReprSchema>;
        try {
            item = fromBinary(IpInfoReprSchema, b64ToBytes(b64));
        } catch (err) {
            console.error("Error loading connection:", err);
            return;
        }

        this.mikeylab.live = false;
        this.ipHandler.refresh();
        this.mikeylab.showStatic();

        this.DOM.ipAddr.section.classList.add("static");
        this.DOM.ipInfo.section.classList.add("static");

        if (document.getElementById(HistoryManager.LIVE_ENTRY_ID) == null) {
            this.genLive();
        }

        this.deactivate();

        await this.mikeylab.displayInfo(item.info!);
        for (let v4 of item.addresses!.ipv4) this.ipHandler.displayIp(v4);
        for (let v6 of item.addresses!.ipv6) this.ipHandler.displayIp(v6);

        if (highlight) {
            highlight.classList.add("active");
        } else {
            const history: Uint8Array[] = await getIdb(HistoryManager.IDB_HISTORY_KEY) ?? [];
            for (const raw of history) {
                const conn = fromBinary(IpInfoStoredSchema, raw);
                if (conn.repr && HistoryManager.checkIdentical(conn.repr, item, true)) {
                    document.getElementById("c-" + conn.id)?.classList.add("active");
                    break;
                }
            }
        }
    }

    private addItem(item: MessageInitShape<typeof IpInfoStoredSchema>, favorite: boolean) {
        const entry = document.createElement("a");
        entry.classList.add("entry");

        const connB64 = bytesToB64(toBinary(IpInfoReprSchema, item.repr as IpInfoRepr));
        entry.href = "#conn=" + connB64;
        entry.id = "c-" + item.id!.toString();

        const connName = HistoryManager.genName(item);
        entry.appendChild(connName);

        const shareLink = new URL(entry.href).href;
        const shareElem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        shareElem.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        shareElem.setAttribute("viewBox", "0 0 16 16");

        if ('share' in navigator && ('canShare' in navigator ? navigator.canShare({ url: shareLink }) : true)) {
            shareElem.innerHTML = `<use xlink:href="dist/icons.svg#box-arrow-up"></use>`;
            shareElem.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.share({
                    "url": shareLink
                });
            }
        } else {
            shareElem.innerHTML = `<use xlink:href="dist/icons.svg#copy"></use>`;

            if ('clipboard' in navigator) {
                shareElem.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(shareLink);
                }
            } else {
                shareElem.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.prompt("Since your browser doesn't support auto-copy, you'll have to copy the link manually. Press any button to close.", shareLink);
                }
            }
        }

        entry.appendChild(shareElem);

        const favStar = HistoryManager.makeFavorite(favorite);
        favStar.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            (async () => {
                if (this.lockFavs) return;
                this.lockFavs = true;
                favStar.classList.add("loading");

                favorite = !favorite;
                favStar.innerHTML = HistoryManager.genUse(favorite);

                let favorites = (await getIdb(HistoryManager.IDB_FAVORITE_KEY) ?? []) as number[];
                if (favorite) {
                    favorites.push(item.id!);
                } else {
                    let index = -1;
                    for (let i in favorites) {
                        if (favorites[i] == item.id) {
                            index = parseInt(i);
                            break;
                        }
                    }
                    if (index !== -1) {
                        if (favorites.length != 1)
                            favorites.splice(index, 1);
                        else
                            favorites = [];
                    }
                }
                await setIdb(HistoryManager.IDB_FAVORITE_KEY, favorites);

                favStar.classList.remove("loading");
                this.lockFavs = false;
            })();
        };
        entry.appendChild(favStar);

        entry.addEventListener("click", () => {
            this.loadItem(connB64, entry);
        });

        HistoryManager.prependChild(this.DOM.history.list, entry);
    }

    async save() {
        const date = BigInt(Date.now());

        if (this.saved) return;
        this.saved = true;

        const ipInfo = this.curIpInfo!;

        if (!ipInfo) return;

        const repr: MessageInitShape<typeof IpInfoReprSchema> = {
            "info": ipInfo,
            "addresses": {
                "ipv4": this.ipHandler.v4,
                "ipv6": this.ipHandler.v6
            }
        };

        let connHistory = (await getIdb(HistoryManager.IDB_HISTORY_KEY) ?? []) as Uint8Array[];

        for (let i of connHistory) {
            const other = fromBinary(IpInfoStoredSchema, i);
            if (other.repr && HistoryManager.checkIdentical(repr, other.repr, false))
                return;
        }

        connHistory.push(toBinary(IpInfoStoredSchema, createPb(IpInfoStoredSchema, {
            repr,
            date,
            "id": await HistoryManager.incrKey()
        })));

        await setIdb(HistoryManager.IDB_HISTORY_KEY, connHistory);
    }

    async loadHistory() {
        let connHistory: Uint8Array[] = await getIdb(HistoryManager.IDB_HISTORY_KEY) ?? [];
        const favorites: number[] = await getIdb(HistoryManager.IDB_FAVORITE_KEY) ?? [];

        let connMap: Map<string, string> = new Map();
        let nonFavorites = [];
        for (const i in connHistory) {
            const raw = connHistory[i]!;

            const conn = fromBinary(IpInfoStoredSchema, raw);

            connMap.set(conn.id.toString(), i);
            const fav = favorites.includes(conn.id);

            this.addItem(conn, fav);

            if (!fav) nonFavorites.push(conn.id);
        }

        if (nonFavorites.length > HistoryManager.MAX_NON_FAVORITES) {
            const toRemove = HistoryManager.MAX_NON_FAVORITES - nonFavorites.length;

            for (let i = 0; i < toRemove; ++i)
                connHistory.splice(parseInt(nonFavorites[i]!.toString()!), 1);

            await setIdb(HistoryManager.IDB_HISTORY_KEY, connHistory);
        }
    }

    async ipComplete(ipInfo: MessageInitShape<typeof IpInfoSchema>) {
        this.curIpInfo = ipInfo;
        this.ipCompleted = true;
        if (this.rtcCompleted) await this.save();
    }

    async rtcComplete() {
        this.rtcCompleted = true;
        if (this.ipCompleted) await this.save();
    }

    async init() {
        await this.loadHistory();

        const hash = new URLSearchParams(window.location.hash.substring(1));
        if (hash.has("conn"))
            await this.loadItem(hash.get("conn")!);
    }

    constructor(ipHandler: IIPHandler, mikeylab: Mikeylab, DOM: {
        ipAddr: {
            section: HTMLElement,
        },
        ipInfo: {
            section: HTMLElement,
        },
        request: {
            section: HTMLElement,
        },
        history: {
            list: HTMLDivElement,
        },
    }) {
        this.ipHandler = ipHandler;
        this.DOM = DOM;
        this.mikeylab = mikeylab;

        this.ipCompleted = false;
        this.rtcCompleted = false;
        this.saved = false;
    }
}
