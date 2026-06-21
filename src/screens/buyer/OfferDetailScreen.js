import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import useNotifications from '../../hooks/useNotifications';
import { getOfferById } from '../../services/offersService';
import { formatRok } from '../../utils/formatDate';
import { createReservation, hasActiveReservation } from '../../services/reservationsService';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';


const OfferDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  // offerId se prosleđuje iz HomeScreen ili MapScreen pri navigaciji
  const { offerId } = route.params;
  const { user } = useAuth();
  // Koristi se za paddingBottom bottom bara na iPhone sa home indicatorom
  const insets = useSafeAreaInsets();

  // null za userId - registracija tokena se radi u AppNavigatoru, ovde samo koristimo lokalne notif.
  const { prikaziLokalnuNotifikaciju } = useNotifications(null, null);

  const [ponuda, setPonuda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kolicina, setKolicina] = useState(1);
  const [rezervisano, setRezervacija] = useState(false); // da li već postoji aktivna rezervacija
  const [rezervisujem, setRezervišujem] = useState(false); // loading stanje dugmeta
  const [retryBrojac, setRetryBrojac] = useState(0); // povećava se na retry da ponovo pokrene useEffect

  // Tab bar se skriva kroz BuyerNavigator (getFocusedRouteNameFromRoute), ne ovde

  // Učitavamo detalje ponude i proveravamo da li korisnik već ima rezervaciju
  useEffect(() => {
    setLoading(true);
    setError(null);
    const ucitaj = async () => {
      try {
        const data = await getOfferById(offerId);
        setPonuda(data);

        // Provera postojeće aktivne rezervacije za ovog kupca
        if (user) {
          const postoji = await hasActiveReservation(offerId, user.id);
          setRezervacija(postoji);
        }
      } catch (err) {
        setError('Greška pri učitavanju ponude. Pokušaj ponovo.');
      } finally {
        setLoading(false);
      }
    };

    ucitaj();
  }, [offerId, user, retryBrojac]);

  // Kreira rezervaciju i obaveštava korisnika o rezultatu
  const onRezervisi = async () => {
    if (!user || !ponuda) return;

    setRezervišujem(true);
    try {
      await createReservation(offerId, user.id, kolicina);
      setRezervacija(true);

      // Lokalna notifikacija kao potvrda rezervacije
      prikaziLokalnuNotifikaciju(
        'Rezervacija uspešna!',
        `Rezervisali ste "${ponuda.naziv}" na adresi ${ponuda.restaurants?.adresa}.`
      );

      Alert.alert(
        'Rezervacija uspešna!',
        `Rezervisali ste ${kolicina} kom ponude "${ponuda.naziv}". Preuzimanje na adresi ${ponuda.restaurants?.adresa}.`,
        [{ text: 'U redu', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće kreirati rezervaciju. Pokušaj ponovo.');
    } finally {
      setRezervišujem(false);
    }
  };

  // retry povećava brojač koji je dep useEffect-a, što pokreće novo učitavanje
  const onRetry = useCallback(() => {
    setRetryBrojac((n) => n + 1);
  }, []);

  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  if (!ponuda) return null;

  const popust = Math.round(
    ((ponuda.originalna_cena - ponuda.snizena_cena) / ponuda.originalna_cena) * 100
  );
  const maxKolicina = Math.min(ponuda.preostala_kolicina, 5);
  const ukupnaCena = (ponuda.snizena_cena * kolicina).toFixed(0);

  return (
    <View style={styles.kontejner}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero slika sa back dugmetom i bedžem */}
        <View style={styles.heroKontejner}>
          {ponuda.slika_url ? (
            <Image source={{ uri: ponuda.slika_url }} style={styles.heroSlika} resizeMode="cover" />
          ) : (
            <View style={[styles.heroSlika, styles.heroPlaceholder]}>
              <Ionicons name="fast-food-outline" size={64} color={colors.border} />
            </View>
          )}

          {/* Back dugme */}
          <TouchableOpacity
            style={styles.backDugme}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Nazad"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Bedž popusta */}
          <View style={styles.popustBedz}>
            <Text style={styles.popustTekst}>-{popust}%</Text>
          </View>
        </View>

        {/* Sadržaj */}
        <View style={styles.sadrzaj}>

          {/* Kategorija pill */}
          <View style={styles.kategorijaRed}>
            <View style={styles.kategorijaBedz}>
              <Text style={styles.kategorijaText}>{ponuda.kategorija}</Text>
            </View>
            {ponuda.status === 'aktivna' && ponuda.preostala_kolicina > 0 && (
              <Text style={styles.dostupnoText}>
                {ponuda.preostala_kolicina} kom dostupno
              </Text>
            )}
          </View>

          {/* Naziv ponude */}
          <Text style={styles.ponudaNaziv}>{ponuda.naziv}</Text>

          {/* Restoran - tapabilno, vodi na RestaurantProfileScreen */}
          <TouchableOpacity
            style={styles.restaurantRed}
            onPress={() => navigation.navigate('RestaurantProfile', { restaurantId: ponuda.restaurants?.id })}
            accessibilityLabel={`Pogledaj profil restorana ${ponuda.restaurants?.naziv}`}
            accessibilityRole="button"
          >
            <Ionicons name="storefront-outline" size={18} color={colors.primary} />
            <Text style={styles.restaurantNaziv}>{ponuda.restaurants?.naziv}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Cene */}
          <View style={styles.ceneKontejner}>
            <View>
              <Text style={styles.ceneLabel}>Cena</Text>
              <View style={styles.ceneRed}>
                <Text style={styles.originalCena}>{ponuda.originalna_cena.toFixed(0)} RSD</Text>
                <Text style={styles.snizenaCena}>{ponuda.snizena_cena.toFixed(0)} RSD</Text>
              </View>
            </View>
            <View style={styles.ustedaKontejner}>
              <Text style={styles.ustedaLabel}>Uštedite</Text>
              <Text style={styles.ustedaIznos}>
                {(ponuda.originalna_cena - ponuda.snizena_cena).toFixed(0)} RSD
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Detalji: rok i adresa */}
          <View style={styles.detaljiKontejner}>
            <View style={styles.detaljiRed}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.detaljiText}>{formatRok(ponuda.rok)}</Text>
            </View>
            <View style={styles.detaljiRed}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.detaljiText}>{ponuda.restaurants?.adresa}</Text>
            </View>
          </View>

          {/* Opis - prikazuje se samo ako postoji */}
          {!!ponuda.opis && (
            <>
              <View style={styles.divider} />
              <Text style={styles.opisNaslov}>O ponudi</Text>
              <Text style={styles.opisTekst}>{ponuda.opis}</Text>
            </>
          )}

          {/* Prostor na dnu za bottom bar */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Fiksni bottom bar: birač količine + dugme za rezervaciju */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {rezervisano ? (
          <View style={styles.rezervisanoKontejner}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.rezervisanoTekst}>Već ste rezervisali ovu ponudu</Text>
          </View>
        ) : (
          <View style={styles.rezervisiRed}>
            {/* Birač količine */}
            <View style={styles.kolicinaBirac}>
              <TouchableOpacity
                style={styles.kolicinaDugme}
                onPress={() => setKolicina((k) => Math.max(1, k - 1))}
                disabled={kolicina <= 1}
                accessibilityLabel="Smanji količinu"
              >
                <Ionicons name="remove" size={18} color={kolicina <= 1 ? colors.border : colors.text} />
              </TouchableOpacity>
              <Text style={styles.kolicinaText}>{kolicina}</Text>
              <TouchableOpacity
                style={styles.kolicinaDugme}
                onPress={() => setKolicina((k) => Math.min(maxKolicina, k + 1))}
                disabled={kolicina >= maxKolicina}
                accessibilityLabel="Povećaj količinu"
              >
                <Ionicons name="add" size={18} color={kolicina >= maxKolicina ? colors.border : colors.text} />
              </TouchableOpacity>
            </View>

            {/* Rezerviši dugme */}
            <TouchableOpacity
              style={[styles.rezervisiDugme, rezervisujem && styles.rezervisiDugmeDisabled]}
              onPress={onRezervisi}
              disabled={rezervisujem}
              accessibilityLabel={`Rezerviši ${kolicina} kom za ${ukupnaCena} RSD`}
              accessibilityRole="button"
            >
              {rezervisujem ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.rezervisiTekst}>Rezerviši</Text>
                  <Text style={styles.rezervisiCena}>{ukupnaCena} RSD</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroKontejner: {
    position: 'relative',
  },
  heroSlika: {
    width: '100%',
    height: 260,
  },
  heroPlaceholder: {
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backDugme: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  popustBedz: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  popustTekst: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sadrzaj: {
    padding: 16,
  },
  kategorijaRed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kategorijaBedz: {
    backgroundColor: colors.primaryLight + '22', // primarna boja sa providnošću
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kategorijaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  dostupnoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ponudaNaziv: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 28,
  },
  restaurantRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  restaurantNaziv: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  ceneKontejner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ceneLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ceneRed: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  originalCena: {
    fontSize: 15,
    color: colors.gray,
    textDecorationLine: 'line-through',
  },
  snizenaCena: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
  },
  ustedaKontejner: {
    backgroundColor: colors.accent + '15',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  ustedaLabel: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '500',
  },
  ustedaIznos: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  detaljiKontejner: {
    gap: 10,
  },
  detaljiRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detaljiText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  opisNaslov: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  opisTekst: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    // paddingBottom se postavlja dinamički via useSafeAreaInsets
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  rezervisiRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kolicinaBirac: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    borderRadius: 10,
    padding: 4,
  },
  kolicinaDugme: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  kolicinaText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    minWidth: 28,
    textAlign: 'center',
  },
  rezervisiDugme: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rezervisiDugmeDisabled: {
    opacity: 0.7,
  },
  rezervisiTekst: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  rezervisiCena: {
    color: colors.white + 'CC',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rezervisanoKontejner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  rezervisanoTekst: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
});

export default OfferDetailScreen;
