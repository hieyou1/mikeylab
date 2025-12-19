import parseUA, { type Platform, type BrowserName } from "../src/lib/ua-parse";

describe("User-Agent parser", () => {
    it("parses Chrome on Windows", () => {
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1.0.0 Safari/537.36";
        const browser: BrowserName = "Chrome";
        const version = "1.0.0";
        const os: Platform = "Windows";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });

    it("parses Chrome on Linux", () => {
        const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0 Safari/537.36";
        const browser: BrowserName = "Chrome";
        const version = "100.0.0";
        const os: Platform = "Linux";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });

    it("parses Firefox on Linux", () => {
        const ua = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:<major>) Gecko/20100101 Firefox/430.0";
        const browser: BrowserName = "Firefox";
        const version = "430.0";
        const os: Platform = "Linux";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });

    it("parses Chrome on Android", () => {
        const ua = "Mozilla/5.0 (Linux; Android 14; <DeviceName>) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/430.0 Mobile Safari/537.36";
        const browser: BrowserName = "Chrome";
        const version = "430.0";
        const os: Platform = "Android";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });

    it("parses Safari on iOS", () => {
        const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/40.0 Mobile/15E148 Safari/604.1";
        const browser: BrowserName = "Safari";
        const version = "40.0";
        const os: Platform = "iOS";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });

    it("parses Safari on iPadOS", () => {
        const ua = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/40.0 Mobile/15E148 Safari/604.1";
        const browser: BrowserName = "Safari";
        const version = "40.0";
        const os: Platform = "iOS";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });

    it("parses Chrome on ChromeOS", () => {
        const ua = "Mozilla/5.0 (X11; CrOS x86_64 <build>) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0 Safari/537.36";
        const browser: BrowserName = "Chrome";
        const version = "43.0";
        const os: Platform = "ChromeOS";

        const actual = parseUA(ua);

        if (actual === false) {
            expect(false);
        } else {
            expect(actual[0]).toEqual(browser);
            expect(actual[1]).toEqual(version);
            expect(actual[2]).toEqual(os);
        }
    });
});