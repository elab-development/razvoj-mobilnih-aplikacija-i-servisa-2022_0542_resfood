import { supabase } from './supabase';

// Dohvata statistike za admin panel
// Vraća: broj korisnika po roliama, restorana, aktivnih ponuda, pendng rezervacija
export const getAdminStats = async () => {
  const [
    { count: ukupnoKupaca },
    { count: ukupnoRestorana },
    { count: ukupnoAktivnihPonuda },
    { count: ukupnoRezervacija },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'buyer'),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'aktivna'),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return {
    kupci: ukupnoKupaca ?? 0,
    restorani: ukupnoRestorana ?? 0,
    aktivnePonude: ukupnoAktivnihPonuda ?? 0,
    pendingRezervacije: ukupnoRezervacija ?? 0,
  };
};

// Dohvata sve korisnike (profiles tabela) sortirane po datumu kreiranja
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Dohvata sve restorane sa podacima vlasnika (profiles join)
export const getAllRestaurants = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      profiles (
        id,
        ime,
        telefon
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};
