import { supabase } from './supabase';

// Registracija novog korisnika - kreira nalog u Supabase Auth
// Trigger u bazi automatski kreira red u profiles tabeli sa prosleđenom rolom i imenom
export const register = async (email, password, ime, role) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { ime, role }, // ovi podaci idu u raw_user_meta_data i trigger ih čita
    },
  });

  if (error) throw error;
  return data;
};

// Prijava korisnika - vraća sesiju i korisnika iz Supabase Auth
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// Odjava korisnika - briše lokalnu sesiju iz AsyncStorage-a
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Dohvata profil korisnika iz profiles tabele na osnovu njegovog auth id-a
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

// Uploaduje avatar korisnika u Supabase Storage 'avatars' bucket
// upsert: true → zamenjuje postojeći avatar istog korisnika
export const uploadAvatar = async (uri, userId) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = (uri.split('.').pop()?.toLowerCase() ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${userId}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
};

// Ažuriranje profila korisnika (ime, telefon, avatar)
export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
