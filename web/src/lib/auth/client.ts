"use client";

import { createAuthClient } from "@neon/auth/next";

/** Browser auth client. Talks only to our own /api/auth route, which proxies to Neon Auth. */
export const authClient = createAuthClient();
