import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { BetterAuthPlugin } from "better-auth";

const rawUrl = process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL || "https://crm.designhubone.in";
const cleanUrl = rawUrl.replace(/^["']|["']$/g, "").replace(/\/+$/, "").trim();

export const authClient = createAuthClient({
    baseURL: cleanUrl, // Base URL of your Better Auth backend.
    plugins: [
        expoClient({
            scheme: "dhpulse",
            storagePrefix: "dhpulse",
            storage: SecureStore,
        }) as unknown as BetterAuthPlugin
    ]
});