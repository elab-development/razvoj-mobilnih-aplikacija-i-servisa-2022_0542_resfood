import React from 'react';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';
import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import RestaurantNavigator from './RestaurantNavigator';
import AdminNavigator from './AdminNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import { navigationRef } from './navigationRef';

// Glavni navigator koji odlučuje koji navigator da prikaže
// na osnovu auth stanja i role korisnika iz profiles tabele
const AppNavigator = () => {
  const { user, profile, loading } = useAuth();

  // Inicijalizuje push notifikacije kad je korisnik ulogovan
  // userId: null kad nije ulogovan → hook ne radi ništa
  useNotifications(user?.id ?? null, navigationRef);

  // Splash se prikazuje samo pri inicijalnom pokretanju dok se sesija proverava
  // Pri logout-u loading je false pa direktno ide na AuthNavigator (Login)
  if (loading) return <SplashScreen />;

  // Korisnik nije ulogovan → prikazujemo auth ekrane
  if (!user || !profile) return <AuthNavigator />;

  // Korisnik je ulogovan → prikazujemo odgovarajući navigator po roli
  if (profile.role === 'restaurant') return <RestaurantNavigator />;
  if (profile.role === 'admin') return <AdminNavigator />;
  return <BuyerNavigator />;
};

export default AppNavigator;
