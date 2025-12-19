export interface IIPHandler {
    cf?: number | Uint8Array;
    // @ts-ignore - can't follow to init()
    v4: number[];
    // @ts-ignore - can't follow to init()
    v6: Uint8Array[];

    getIps(): Promise<void>;
    setCf(ip: number | Uint8Array): void;
    refresh(): void;
    displayIp(ip: number | Uint8Array): string;
}