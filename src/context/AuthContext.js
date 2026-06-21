import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getProfile } from '../services/authService';

// Kontekst koji čuva globalno auth stanje i dostupan je svim ekranima
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Supabase auth korisnik
  const [profile, setProfile] = useState(null); // Podaci iz profiles tabele (rola, ime...)
  const [loading, setLoading] = useState(true); // true dok se proverava postojeća sesija

  useEffect(() => {
    // Proveravamo da li postoji aktivna sesija pri pokretanju aplikacije
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Slušamo promene auth stanja (login, logout, refresh tokena)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dohvata profil iz baze i čuva ga u state-u
  const fetchProfile = async (userId) => {
    try {
      const data = await getProfile(userId);
      setProfile(data);
    } catch (error) {
      console.error('Greška pri učitavanju profila:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Osvežava profil nakon izmene (npr. promena imena ili slike)
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
