interface SyncMessage {
    type: "sync";
    version?: string;
}

export type ClientToSWMessage = SyncMessage