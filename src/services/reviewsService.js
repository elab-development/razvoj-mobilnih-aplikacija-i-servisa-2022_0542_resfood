import { supabase } from './supabase';

// Dohvata sve recenzije za restoran sa imenom kupca
// Vraća niz recenzija sortiran od najnovije
export const getReviewsByRestaurant = async (restaurantId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles (
        ime
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Proverava da li je kupac već ostavio recenziju za ovaj restoran
export const hasUserReviewed = async (restaurantId, buyerId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

// Proverava da li kupac ima barem jednu completed rezervaciju u ovom restoranu
// Kupac može da ostavi recenziju samo ako je bio korisnik restorana
export const canUserReview = async (restaurantId, buyerId) => {
  // Korak 1: Dohvati sve offer ID-eve za ovaj restoran
  const { data: ponude, error: ponudeError } = await supabase
    .from('offers')
    .select('id')
    .eq('restaurant_id', restaurantId);

  if (ponudeError) throw ponudeError;
  if (!ponude?.length) return false;

  const offerIds = ponude.map((p) => p.id);

  // Korak 2: Proveri da li kupac ima completed rezervaciju za te ponude
  const { data, error } = await supabase
    .from('reservations')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('status', 'completed')
    .in('offer_id', offerIds)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

// Dodaje novu recenziju za restoran od strane kupca
// ocena: broj 1-5, komentar: opcioni tekst
export const addReview = async (restaurantId, buyerId, ocena, komentar) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      restaurant_id: restaurantId,
      buyer_id: buyerId,
      ocena,
      komentar: komentar.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Briše recenziju kupca (samo svoju)
export const deleteReview = async (reviewId) => {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) throw error;
};
