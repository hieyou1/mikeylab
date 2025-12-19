import { bytesToB64 } from "./bytes-util";
import type { IIPHandler } from "./i-ip-handler";
import { bytesToV6, intToV4, v4ToInt, v6ToBytes } from "./ip-convert";

export class IPHandlerMock implements IIPHandler {
    private readonly DOM: {
        ipAddr: {
            section: HTMLElement,
            ipv4: HTMLDivElement,
            ipv6: HTMLDivElement,
        }
    };

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
        this.v4 = [v4ToInt('1.1.1.1')];
        this.v6 = [v6ToBytes('1010:1101::1010')];

        this.displayIp(this.v4[0] as number);
        this.displayIp(this.v6[0] as Uint8Array);

        this.DOM.ipAddr.section.classList.replace("loading", "populated");
    }

    setCf(ip: number | Uint8Array) {
        this.cf = ip;
        document.querySelector(`span[data-ip="${this.displayIp(ip)}"]`)?.classList.add("cf");
    }

    private init() {
        this.v4 = [];
        this.v6 = [];
        this.displayed = [];
        this.cf = undefined;
        this.DOM.ipAddr.ipv4.textContent = this.DOM.ipAddr.ipv6.textContent = "";
        this.DOM.ipAddr.section.classList.remove("populated");
        this.DOM.ipAddr.section.classList.add("loading");
    }

    refresh() {
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