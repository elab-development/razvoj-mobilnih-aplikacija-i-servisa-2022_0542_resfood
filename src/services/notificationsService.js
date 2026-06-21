import { supabase } from './supabase';

// Čita sve notifikacije korisnika iz notifications tabele, sortirano novo→staro
export const getMyNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Vraća broj nepročitanih notifikacija (za badge)
export const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('procitana', false);

  if (error) throw error;
  return count ?? 0;
};

// Označava jednu notifikaciju kao pročitanu
export const markAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ procitana: true })
    .eq('id', notificationId);

  if (error) throw error;
};

// Označava sve notifikacije korisnika kao pročitane
export const markAllAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ procitana: true })
    .eq('user_id', userId)
    .eq('procitana', false);

  if (error) throw error;
};

// Kreira novu notifikaciju za korisnika u bazi
// Koristi se na strani servera ili admin akcijama
export const createNotification = async (userId, naslov, poruka) => {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, naslov, poruka });

  if (error) throw error;
};

// Čuva Expo Push Token korisnika u profiles tabeli
// NAPOMENA: Za ovo je potrebno dodati kolonu 'push_token TEXT' u profiles tabelu u Supabase dashboardu
export const savePushToken = async (userId, token) => {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  // Ne bacamo grešku ako kolona ne postoji - notifikacije su opciona funkcionalnost
  if (error) console.warn('[Notifications] push_token kolona možda nije dodata u profiles:', error.message);
};
