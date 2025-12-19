export class CheckLoop {
    private static readonly CHECK_INTERVAL = 15000;

    private cb: () => Promise<void>;
    private to?: NodeJS.Timeout | number;
    checking: boolean = false;

    private async loop() {
        while (this.checking) {
            await new Promise<void>((resolve) => this.to = setTimeout(resolve, CheckLoop.CHECK_INTERVAL));
            await this.cb();
        }
    }

    start() {
        if (this.checking) return;
        this.checking = true;
        this.loop();
    }

    stop() {
        this.checking = false;
        if (this.to) clearTimeout(this.to);
    }

    constructor(cb: () => Promise<void>) {
        this.cb = cb;
    }
}