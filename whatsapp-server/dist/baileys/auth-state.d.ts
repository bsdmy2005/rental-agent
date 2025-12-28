import { AuthenticationState } from "@whiskeysockets/baileys";
export declare class PostgresAuthState {
    private pool;
    constructor();
    getAuthState(sessionId: string): Promise<{
        state: AuthenticationState;
        saveCreds: () => Promise<void>;
    }>;
    private saveToDb;
    clearAuthState(sessionId: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=auth-state.d.ts.map