import { supabase } from './supabase';

// Dohvata restorane koji imaju bar jednu aktivnu ponudu i poznate koordinate
// Koristi se na MapScreen za prikaz pinova
export const getRestaurantsWithActiveOffers = async () => {
  const sada = new Date().toISOString();

  // Korak 1: ID-evi restorana koji trenutno imaju aktivne ponude
  const { data: ponude, error: err1 } = await supabase
    .from('offers')
    .select('restaurant_id')
    .eq('status', 'aktivna')
    .gt('preostala_kolicina', 0)
    .gt('rok', sada);

  if (err1) throw err1;
  if (!ponude?.length) return [];

  const ids = [...new Set(ponude.map((o) => o.restaurant_id))];

  // Korak 2: Podaci restorana - samo oni sa unesenim GPS koordinatama
  const { data, error: err2 } = await supabase
    .from('restaurants')
    .select('id, naziv, adresa, slika_url, latitude, longitude, kategorija')
    .in('id', ids)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (err2) throw err2;
  return data ?? [];
};

// Kreira novi restoran za vlasnika
export const createRestaurant = async (data) => {
  const { data: result, error } = await supabase
    .from('restaurants')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
};

// Ažurira podatke restorana
export const updateRestaurant = async (restaurantId, data) => {
  const { data: result, error } = await supabase
    .from('restaurants')
    .update(data)
    .eq('id', restaurantId)
    .select()
    .single();
  if (error) throw error;
  return result;
};

// Uploaduje sliku restorana u Supabase Storage 'avatars' bucket (podFolder restaurants/)
export const uploadRestaurantImage = async (uri, restaurantId) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = (uri.split('.').pop()?.toLowerCase() ?? 'jpg').replace('jpeg', 'jpg');
  const path = `restaurants/${restaurantId}.${ext}`;

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

// Dohvata detalje jednog restorana po ID-u (za RestaurantProfileScreen)
export const getRestaurantById = async (restaurantId) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) throw error;
  return data;
};

// Dohvata prvi restoran vlasnika (owner_id = userId)
export const getMyRestaurant = async (userId) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};
