import type { UserProfile } from "../../types/auth.types";

const CACHE_KEY = "user_profile_v1";
const CACHE_TTL_MS = 2 * 60 * 1000;

interface ProfileCacheEnvelope {
    data: UserProfile;
    cachedAt: number;
}

export interface CacheReadResult {
    profile: UserProfile;
    isStale: boolean;
}

export function readProfileCache(expectedUserId: string): CacheReadResult | null {
    try{
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (!cachedData) {
            return null;
        }

        const envelope = JSON.parse(cachedData) as ProfileCacheEnvelope;
        if (!envelope?.data?.id || typeof envelope.cachedAt !== "number") {
            clearProfileCache();
            return null;
        }

        if (envelope.data.id !== expectedUserId) {
            clearProfileCache();
            return null;
        }

        const isStale = Date.now() - envelope.cachedAt > CACHE_TTL_MS;
        return { profile: envelope.data, isStale };
    } catch {
        clearProfileCache();
        return null;
    }
}

export function writeProfileCache(profile: UserProfile): void {
    try{
        const envelope: ProfileCacheEnvelope = {
            data: profile,
            cachedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
    } catch (error) {
        console.warn("Error writing profile cache", error);
    }
}
export function clearProfileCache() {
    localStorage.removeItem(CACHE_KEY);
}

export {CACHE_KEY};