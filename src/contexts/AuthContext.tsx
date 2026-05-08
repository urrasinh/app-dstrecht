import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeAuth, type User } from '../firebase';

interface AuthCtx {
    user: User | null;
    loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeAuth(u => {
            setUser(u);
            setLoading(false);
        });
        return unsub;
    }, []);

    return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
