import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { getRestaurantsWithActiveOffers } from '../../services/restaurantsService';
import LoadingIndicator from '../../components/common/LoadingIndicator';

// Defaultna lokacija - Beograd (koristi se kada korisnik ne dozvoli lokaciju)
const BEOGRAD = {
  latitude: 44.8176,
  longitude: 20.4569,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MapScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const mapRef = useRef(null);

  const [restorani, setRestorani] = useState([]);
  const [korisnikLokacija, setKorisnikLokacija] = useState(null);
  const [dozvola, setDozvola] = useState(null); // 'granted' | 'denied' | null
  const [loading, setLoading] = useState(true);
  const [odabrani, setOdabrani] = useState(null); // odabrani restoran za info karticu

  useEffect(() => {
    inicijalizuj();
  }, []);

  // Traži dozvolu za lokaciju i učitava restorane paralelno
  const inicijalizuj = async () => {
    try {
      const [lokacija] = await Promise.all([
        ucitajLokaciju(),
        ucitajRestorane(),
      ]);
      if (lokacija) setKorisnikLokacija(lokacija);
    } finally {
      setLoading(false);
    }
  };

  // Traži dozvolu za geolokaciju i vraća koordinate ako je odobrena
  const ucitajLokaciju = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setDozvola(status);

      if (status !== 'granted') return null;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return pos.coords;
    } catch {
      return null;
    }
  };

  // Dohvata restorane sa aktivnim ponudama i GPS koordinatama
  const ucitajRestorane = async () => {
    try {
      const data = await getRestaurantsWithActiveOffers();
      setRestorani(data);
    } catch (err) {
      console.error('Greška pri učitavanju restorana:', err.message);
    }
  };

  // Centrira mapu na korisnikovu poziciju
  const centrisiNaKorisniku = () => {
    if (!korisnikLokacija || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: korisnikLokacija.latitude,
      longitude: korisnikLokacija.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  // Navigira na RestaurantProfileScreen iz info kartice
  const onPogledajPonude = (restaurantId) => {
    setOdabrani(null);
    navigation.navigate('RestaurantProfile', { restaurantId });
  };

  if (loading) return <LoadingIndicator message="Učitavanje mape..." />;

  const initialRegion = korisnikLokacija
    ? {
        latitude: korisnikLokacija.latitude,
        longitude: korisnikLokacija.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : BEOGRAD;

  return (
    <View style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Mapa - zauzima ceo ekran */}
      <MapView
        ref={mapRef}
        style={styles.mapa}
        initialRegion={initialRegion}
        showsUserLocation={dozvola === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Pin za svaki restoran sa aktivnim ponudama */}
        {restorani.map((restoran) => (
          <Marker
            key={restoran.id}
            coordinate={{
              latitude: restoran.latitude,
              longitude: restoran.longitude,
            }}
            onPress={() => setOdabrani(restoran)}
          >
            {/* Prilagođeni pin - zelena boja sa ikonom */}
            <View style={[
              styles.pin,
              odabrani?.id === restoran.id && styles.pinOdabran,
            ]}>
              <Ionicons
                name="storefront"
                size={15}
                color={colors.white}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header na mapi */}
      <SafeAreaView style={styles.headerWrapper} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerTekst}>
            <Text style={styles.naslov}>Mapa ponuda</Text>
            <Text style={styles.podnaslov}>
              {restorani.length > 0
                ? `${restorani.length} restorana u blizini`
                : 'Nema aktivnih ponuda'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Dugme za moju lokaciju */}
      {dozvola === 'granted' && korisnikLokacija && (
        <TouchableOpacity
          style={styles.lokacijaDugme}
          onPress={centrisiNaKorisniku}
          accessibilityLabel="Centriraj na mojoj lokaciji"
          accessibilityRole="button"
        >
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Poruka ako je dozvola odbijena */}
      {dozvola === 'denied' && (
        <TouchableOpacity
          style={styles.dozvolaTraka}
          onPress={() => Linking.openSettings()}
          accessibilityLabel="Dozvoli pristup lokaciji u podešavanjima"
          accessibilityRole="button"
        >
          <Ionicons name="location-outline" size={16} color={colors.white} />
          <Text style={styles.dozvolaTekst}>
            Dozvoli lokaciju za bolje iskustvo
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Prazno stanje - nema restorana na mapi */}
      {restorani.length === 0 && !loading && (
        <View style={styles.praznoKontejner}>
          <Ionicons name="fast-food-outline" size={32} color={colors.gray} />
          <Text style={styles.praznoTekst}>Nema aktivnih ponuda u okolini</Text>
        </View>
      )}

      {/* Info kartica odabranog restorana */}
      {odabrani && (
        <View style={styles.infoKartica}>
          {/* Zaglavlje kartice */}
          <View style={styles.karticaHeader}>
            <View style={styles.kategorijaBedz}>
              <Text style={styles.kategorijaText}>{odabrani.kategorija}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setOdabrani(null)}
              style={styles.zatvoriDugme}
              accessibilityLabel="Zatvori"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Naziv restorana */}
          <Text style={styles.restaurantNaziv} numberOfLines={1}>
            {odabrani.naziv}
          </Text>

          {/* Adresa */}
          <View style={styles.adresaRed}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.adresaTekst} numberOfLines={1}>
              {odabrani.adresa}
            </Text>
          </View>

          {/* Dugme za pregled ponuda */}
          <TouchableOpacity
            style={styles.pogledajDugme}
            onPress={() => onPogledajPonude(odabrani.id)}
            accessibilityLabel={`Pogledaj ponude restorana ${odabrani.naziv}`}
            accessibilityRole="button"
          >
            <Text style={styles.pogledajTekst}>Pogledaj ponude</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
  },
  mapa: {
    flex: 1,
  },
  // Header overlay
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    margin: 16,
    marginTop: Platform.OS === 'android' ? 40 : 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  naslov: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  podnaslov: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerTekst: {
    flex: 1,
  },
  // Dugme za lokaciju - pozicionirano iznad info kartice (kartica ~150px + padding)
  lokacijaDugme: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  // Traka za dozvolu lokacije
  dozvolaTraka: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 100 : 80,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  dozvolaTekst: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  // Prazno stanje
  praznoKontejner: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  praznoTekst: {
    fontSize: 14,
    color: colors.grayDark,
    fontWeight: '500',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // Prilagođeni pin markera
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinOdabran: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  // Info kartica odabranog restorana
  infoKartica: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  karticaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kategorijaBedz: {
    backgroundColor: colors.primaryLight + '22',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  kategorijaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  zatvoriDugme: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantNaziv: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  adresaRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  adresaTekst: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  pogledajDugme: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pogledajTekst: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default MapScreen;
