import { bytesToB64 } from "./bytes-util";
import type { IIPHandler } from "./i-ip-handler.d.ts";
import { bytesToV6, intToV4, isV4, v4ToInt, v6ToBytes } from "./ip-convert";

export class IPHandler implements IIPHandler {
    private static readonly ICE_SERVERS = {
        urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302"
        ]
    };

    private readonly DOM: {
        ipAddr: {
            section: HTMLElement,
            ipv4: HTMLDivElement,
            ipv6: HTMLDivElement,
        }
    };

    // @ts-ignore - can't follow to init()
    private abort: AbortController;

    // @ts-ignore
    private displayed: string[];

    cf?: number | Uint8Array;
    // @ts-ignore - can't follow to init()
    v4: number[];
    // @ts-ignore - can't follow to init()
    v6: Uint8Array[];

    displayIp(ip: number | Uint8Array): string {
        const isv4 = typeof ip === "number";

        const machineStr = (isv4 ? ip.toString() : bytesToB64(ip));
        const humanStr = (isv4 ? intToV4(ip) : bytesToV6(ip));
        const appendTo = (isv4 ? this.DOM.ipAddr.ipv4 : this.DOM.ipAddr.ipv6);

        if (this.displayed.includes(machineStr)) return machineStr;
        this.displayed.push(machineStr);

        const span = document.createElement("span");
        span.setAttribute("data-ip", machineStr);
        span.textContent = (appendTo.children.length > 0 ? "\n" : "") + humanStr;

        appendTo.appendChild(span);

        return machineStr;
    }

    async getIps() {
        const rtcPeer = new RTCPeerConnection({
            "iceServers": [IPHandler.ICE_SERVERS]
        });

        let closed = false;
        this.abort.signal.addEventListener("abort", () => {
            if (!closed && rtcPeer.connectionState !== "closed") {
                closed = true;
                rtcPeer.close();
            }
        });

        const addressProm = new Promise<void>((resolve) => {
            rtcPeer.addEventListener("icecandidate", (e) => {
                if (closed) return;

                if (e.candidate === null) {
                    closed = true;
                    rtcPeer.close();

                    resolve();
                } else if (e.candidate.address && e.candidate.type === "srflx") {
                    const ip = e.candidate.address;

                    if (isV4(ip)) {
                        let repr: number;

                        try {
                            repr = v4ToInt(ip);
                        } catch (err) {
                            console.error("Invalid IPv4: " + ip, err);
                            return;
                        }

                        this.v4.push(repr);
                        this.displayIp(repr);
                    } else {
                        let repr: Uint8Array;

                        try {
                            repr = v6ToBytes(ip);
                        } catch (err) {
                            console.error("Invalid IPv6: " + ip, err);
                            return;
                        }

                        this.v6.push(repr);
                        this.displayIp(repr);
                    }
                }
            }, {
                "signal": this.abort.signal
            });
        });

        rtcPeer.createDataChannel("");
        await rtcPeer.setLocalDescription(await rtcPeer.createOffer());

        await addressProm;

        this.DOM.ipAddr.section.classList.replace("loading", "populated");
    }

    setCf(ip: number | Uint8Array) {
        this.cf = ip;
        document.querySelector(`span[data-ip="${this.displayIp(ip)}"]`)?.classList.add("cf");
    }

    private init() {
        this.abort = new AbortController();
        this.v4 = [];
        this.v6 = [];
        this.displayed = [];
        this.cf = undefined;
        this.DOM.ipAddr.ipv4.textContent = this.DOM.ipAddr.ipv6.textContent = "";
        this.DOM.ipAddr.section.classList.remove("populated");
        this.DOM.ipAddr.section.classList.add("loading");
    }

    refresh() {
        this.abort.abort();
        this.init();
    }

    constructor(DOM: {
        ipAddr: {
            section: HTMLElement,
            ipv4: HTMLDivElement,
            ipv6: HTMLDivElement,
        }
    }) {
        this.DOM = DOM;
        this.init();
    }
}