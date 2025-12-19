export type BrowserName = "Edge" | "Opera" | "Chrome" | "Firefox" | "Safari" | "Unknown";
export type Version = string;
export type Platform = "Windows" | "macOS" | "Android" | "Linux" | "iOS" | "ChromeOS" | "Unknown";

const matchers = {
    'Edge': /(edg)\/([\d.]+)/,
    'Opera': /(opr)\/([\d.]+)/,
    'Chrome': /(chrome)\/([\d.]+)/,
    'Firefox': /(firefox)\/([\d.]+)/,
    'Safari': /(version)\/([\d.]+).*safari/
} as Record<BrowserName, RegExp>;

export default function parseUA(uaString: string): [BrowserName, Version, Platform] | false {
    const ua = uaString.toLowerCase();

    let browserName: BrowserName | undefined;
    let browserVersion;

    for (const [name, regex] of Object.entries(matchers)) {
        const match = ua.match(regex);

        if (match) {
            browserName = name as BrowserName;
            browserVersion = match[2];
        }
    }

    const fallback = ua.match(/([a-z]+)\/([\d.]+)$/i);
    if (!browserName && fallback) {
        browserName = fallback[1] as BrowserName;
        browserVersion = fallback[2];
    }

    let platform: Platform | undefined;
    if (/windows/i.test(ua)) platform = 'Windows';
    else if (/iphone|ipad|ipod/i.test(ua)) platform = 'iOS';
    else if (/mac os x|macintosh/i.test(ua)) platform = 'macOS';
    else if (/android/i.test(ua)) platform = 'Android';
    else if (/linux/i.test(ua)) platform = 'Linux';
    else if (/cros/i.test(ua)) platform = 'ChromeOS';

    return [browserName ?? "Unknown", browserVersion ?? "?", platform ?? "Unknown"];
}