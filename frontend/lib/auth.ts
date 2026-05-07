export type JwtUser = { role: string; username: string; accountId: number };

export function getUserFromToken(): JwtUser | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            role: payload.role || 'student',
            username: payload.username || '',
            accountId: payload.sub || 0
        };
    } catch {
        return null;
    }
}

/** Returns user if logged in; otherwise redirects to /login and returns null. */
export function requireAuth(router: { replace: (href: string) => void }): JwtUser | null {
    const token = localStorage.getItem('token');
    const user = getUserFromToken();
    if (!token || !user) {
        router.replace('/login');
        return null;
    }
    return user;
}
