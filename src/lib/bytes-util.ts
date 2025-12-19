export function b64ToBytes(b64: string): Uint8Array {
    return ('fromBase64' in Uint8Array) ? // @ts-ignore - not here yet
        Uint8Array.fromBase64(b64, { alphabet: "base64url" }) :
        Uint8Array.from([...atob(b64.replace(/\_/g, "/").replace(/\-/g, "+"))].map((m) => m.codePointAt(0)));
}

export function bytesToB64(bytes: Uint8Array): string {
    return ('toBase64' in Uint8Array.prototype) ? // @ts-ignore - not here yet
        bytes.toBase64({ alphabet: "base64url" }) as string :
        btoa([...bytes].map((byte) => String.fromCodePoint(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_")
}