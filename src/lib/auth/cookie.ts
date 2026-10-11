// Kept free of Node-only imports so middleware can use it.

/** `__Host-` makes the browser refuse the cookie unless it's Secure, host-only and path=/. */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-zs_session" : "zs_session";
