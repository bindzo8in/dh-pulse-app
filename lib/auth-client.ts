import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { BetterAuthPlugin } from "better-auth";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL, // Base URL of your Better Auth backend.
    plugins: [
        expoClient({
            scheme: "dhpulse",
            storagePrefix: "dhpulse",
            storage: SecureStore,
        }) as unknown as BetterAuthPlugin
    ]
});