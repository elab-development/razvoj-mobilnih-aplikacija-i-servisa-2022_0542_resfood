import { supabase } from './supabase';

// Dohvata sve aktivne ponude sa podacima restorana
// Parametar kategorija: null ili 'sve' = sve ponude, inače filtrira po kategoriji
export const getActiveOffers = async (kategorija = null) => {
  let query = supabase
    .from('offers')
    .select(`
      *,
      restaurants (
        id,
        naziv,
        adresa,
        slika_url
      )
    `)
    .eq('status', 'aktivna')
    .gt('preostala_kolicina', 0)
    .gt('rok', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (kategorija && kategorija !== 'sve') {
    query = query.eq('kategorija', kategorija);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

// Dohvata sve ponude jednog restorana (za DashboardScreen)
export const getRestaurantOffers = async (restaurantId) => {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Briše ponudu po ID-u (samo vlasnik restorana može brisati - RLS)
export const deleteOffer = async (offerId) => {
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', offerId);

  if (error) throw error;
};

// Kreira novu ponudu u bazi
export const createOffer = async (data) => {
  const { data: result, error } = await supabase
    .from('offers')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
};

// Ažurira postojeću ponudu
export const updateOffer = async (offerId, data) => {
  const { data: result, error } = await supabase
    .from('offers')
    .update(data)
    .eq('id', offerId)
    .select()
    .single();
  if (error) throw error;
  return result;
};

// Uploaduje sliku ponude u Supabase Storage 'offers' bucket
// Vraća javni URL uploadovane slike
export const uploadOfferImage = async (uri, restaurantId) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = (uri.split('.').pop()?.toLowerCase() ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${restaurantId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('offers')
    .upload(path, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

  if (error) throw error;

  const { data } = supabase.storage.from('offers').getPublicUrl(path);
  return data.publicUrl;
};

// Dohvata aktivne ponude jednog restorana (za RestaurantProfileScreen - kupac)
export const getActiveOffersByRestaurant = async (restaurantId) => {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'aktivna')
    .gt('preostala_kolicina', 0)
    .gt('rok', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Dohvata jednu ponudu po ID-u sa svim podacima (za OfferDetailScreen)
export const getOfferById = async (offerId) => {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      *,
      restaurants (
        id,
        naziv,
        adresa,
        opis,
        slika_url,
        latitude,
        longitude,
        kategorija
      )
    `)
    .eq('id', offerId)
    .single();

  if (error) throw error;
  return data;
};
