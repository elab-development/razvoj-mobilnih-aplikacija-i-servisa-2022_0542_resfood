import { supabase } from './supabase';

// Kreira novu rezervaciju za kupca
// Vraća kreiran objekat rezervacije
export const createReservation = async (offerId, buyerId, kolicina) => {
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      offer_id: offerId,
      buyer_id: buyerId,
      kolicina,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Proverava da li kupac već ima aktivnu (pending) rezervaciju za ovu ponudu
export const hasActiveReservation = async (offerId, buyerId) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('id')
    .eq('offer_id', offerId)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

// Dohvata sve rezervacije kupca sa podacima ponude i restorana (za ReservationsScreen)
export const getBuyerReservations = async (buyerId) => {
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offers (
        id,
        naziv,
        snizena_cena,
        slika_url,
        rok,
        restaurants (
          naziv,
          adresa
        )
      )
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Otkazuje rezervaciju (postavlja status na 'cancelled')
export const cancelReservation = async (reservationId) => {
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId);

  if (error) throw error;
};

// Menja status rezervacije (za restoran: pending → completed ili cancelled)
export const updateReservationStatus = async (reservationId, status) => {
  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', reservationId);

  if (error) throw error;
};

// Dohvata sve rezervacije za ponude jednog restorana (za OrdersScreen)
// Vraća rezervacije sa podacima o ponudi i kupcu
export const getRestaurantReservations = async (restaurantId) => {
  // Korak 1: ID-evi svih ponuda ovog restorana
  const { data: ponude, error: err1 } = await supabase
    .from('offers')
    .select('id')
    .eq('restaurant_id', restaurantId);

  if (err1) throw err1;
  if (!ponude?.length) return [];

  const offerIds = ponude.map((p) => p.id);

  // Korak 2: Rezervacije za te ponude sa detaljima kupca i ponude
  const { data, error: err2 } = await supabase
    .from('reservations')
    .select(`
      *,
      offers (
        id,
        naziv,
        snizena_cena,
        slika_url
      ),
      profiles (
        ime,
        telefon
      )
    `)
    .in('offer_id', offerIds)
    .order('created_at', { ascending: false });

  if (err2) throw err2;
  return data ?? [];
};
