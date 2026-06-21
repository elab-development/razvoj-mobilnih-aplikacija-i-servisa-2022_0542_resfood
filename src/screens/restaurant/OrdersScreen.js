import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { statusColors } from '../../constants/colors';
import useNotifications from '../../hooks/useNotifications';
import { getMyRestaurant } from '../../services/restaurantsService';
import {
  getRestaurantReservations,
  updateReservationStatus,
} from '../../services/reservationsService';
import { formatDatum } from '../../utils/formatDate';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

// Filteri statusa - id mora odgovarati vrednostima u bazi (osim 'sve')
const FILTERI = [
  { id: 'sve', label: 'Sve' },
  { id: 'pending', label: 'Na čekanju' },
  { id: 'completed', label: 'Završene' },
  { id: 'cancelled', label: 'Otkazane' },
];

// Konfiguracija za prikaz statusa - boja, ikona i tekst
const STATUS_KONFIG = {
  pending: { boja: statusColors.pending, ikona: 'time-outline', tekst: 'Na čekanju' },
  completed: { boja: statusColors.completed, ikona: 'checkmark-circle-outline', tekst: 'Završena' },
  cancelled: { boja: statusColors.cancelled, ikona: 'close-circle-outline', tekst: 'Otkazana' },
};


// ─────────────────────────────────────────────

// Kartica jedne rezervacije
// Props: rezervacija, onZavrsi, onOtkazи
const RezervacijaKartica = ({ rezervacija, onZavrsi, onOtkazi }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const konfig = STATUS_KONFIG[rezervacija.status] ?? STATUS_KONFIG.pending;
  const ukupno = (rezervacija.kolicina * (rezervacija.offers?.snizena_cena ?? 0)).toFixed(0);
  const isPending = rezervacija.status === 'pending';

  return (
    <View style={styles.kartica}>
      {/* Gornji red: kupac + status */}
      <View style={styles.karticaHeader}>
        <View style={styles.kupacInfo}>
          <View style={styles.avatarKrug}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.kupacIme}>
              {rezervacija.profiles?.ime ?? 'Nepoznat kupac'}
            </Text>
            {rezervacija.profiles?.telefon ? (
              <Text style={styles.kupacTelefon}>{rezervacija.profiles.telefon}</Text>
            ) : null}
          </View>
        </View>
        {/* Status bedž */}
        <View style={[styles.statusBedz, { backgroundColor: konfig.boja + '18' }]}>
          <Ionicons name={konfig.ikona} size={13} color={konfig.boja} />
          <Text style={[styles.statusTekst, { color: konfig.boja }]}>{konfig.tekst}</Text>
        </View>
      </View>

      {/* Srednji red: ponuda + iznos */}
      <View style={styles.ponudaRed}>
        <View style={styles.ponudaInfo}>
          <Ionicons name="fast-food-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.ponudaNaziv} numberOfLines={1}>
            {rezervacija.offers?.naziv ?? 'Nepoznata ponuda'}
          </Text>
        </View>
        <View style={styles.iznosKontejner}>
          <Text style={styles.kolicinaTekst}>{rezervacija.kolicina} kom</Text>
          <Text style={styles.iznosTekst}>{ukupno} RSD</Text>
        </View>
      </View>

      {/* Datum rezervacije */}
      <Text style={styles.datumTekst}>{formatDatum(rezervacija.created_at)}</Text>

      {/* Akciona dugmad - samo za pending rezervacije */}
      {isPending && (
        <View style={styles.akcije}>
          <TouchableOpacity
            style={styles.zavrsiDugme}
            onPress={onZavrsi}
            accessibilityLabel="Označi rezervaciju kao završenu"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <Text style={styles.zavrsiTekst}>Završi preuzimanje</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.otkaziDugme}
            onPress={onOtkazi}
            accessibilityLabel="Otkaži rezervaciju"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────

const OrdersScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();
  // null za userId - registracija tokena se radi u AppNavigatoru
  const { prikaziLokalnuNotifikaciju } = useNotifications(null, null);

  const [rezervacije, setRezervacije] = useState([]);
  const [aktivniFilter, setAktivniFilter] = useState('sve');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [restoran, setRestoran] = useState(null);

  const prvoUcitavanje = useRef(true);

  // Učitava restoran i rezervacije; pokaziLoader = false za tiho osvežavanje
  const ucitajSve = useCallback(async (pokaziLoader = true) => {
    if (pokaziLoader) setLoading(true);
    setError(null);
    try {
      // Dohvata restoran ulogovanog korisnika
      const r = restoran ?? (await getMyRestaurant(user.id));
      if (!restoran) setRestoran(r);

      if (r) {
        // Dohvata sve rezervacije za ponude ovog restorana
        const data = await getRestaurantReservations(r.id);
        setRezervacije(data);
      }
    } catch {
      setError('Greška pri učitavanju. Proveri internet konekciju.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, restoran]);

  // Inicijalno i na fokus - tiho osvežavanje pri povratku na tab
  useFocusEffect(
    useCallback(() => {
      if (prvoUcitavanje.current) {
        prvoUcitavanje.current = false;
        ucitajSve(true);
      } else {
        ucitajSve(false);
      }
    }, [ucitajSve])
  );

  // Menja status rezervacije na 'completed' uz potvrdu
  const onZavrsi = (rezervacija) => {
    Alert.alert(
      'Potvrdi preuzimanje',
      `Da li je kupac ${rezervacija.profiles?.ime ?? ''} preuzeo narudžbinu "${rezervacija.offers?.naziv}"?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Da, završi',
          onPress: async () => {
            try {
              await updateReservationStatus(rezervacija.id, 'completed');
              // Lokalno ažuriramo status bez novog fetch-a
              setRezervacije((prev) =>
                prev.map((r) =>
                  r.id === rezervacija.id ? { ...r, status: 'completed' } : r
                )
              );
              // Lokalna notifikacija kao potvrda vlasnika restorana
              prikaziLokalnuNotifikaciju(
                'Preuzimanje potvrđeno',
                `Rezervacija za "${rezervacija.offers?.naziv}" je uspešno završena.`
              );
            } catch {
              Alert.alert('Greška', 'Nije moguće ažurirati status. Pokušaj ponovo.');
            }
          },
        },
      ]
    );
  };

  // Menja status rezervacije na 'cancelled' uz potvrdu
  const onOtkazi = (rezervacija) => {
    Alert.alert(
      'Otkaži rezervaciju',
      `Da li ste sigurni da želite da otkažete rezervaciju kupca ${rezervacija.profiles?.ime ?? ''}?`,
      [
        { text: 'Nazad', style: 'cancel' },
        {
          text: 'Otkaži rezervaciju',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateReservationStatus(rezervacija.id, 'cancelled');
              setRezervacije((prev) =>
                prev.map((r) =>
                  r.id === rezervacija.id ? { ...r, status: 'cancelled' } : r
                )
              );
            } catch {
              Alert.alert('Greška', 'Nije moguće otkazati rezervaciju. Pokušaj ponovo.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage message={error} onRetry={() => ucitajSve(true)} />;

  // Filtrira rezervacije prema odabranom statusu
  const filtrirane = aktivniFilter === 'sve'
    ? rezervacije
    : rezervacije.filter((r) => r.status === aktivniFilter);

  // Brojač za svaki filter (prikazuje se uz label)
  const broji = (status) => status === 'sve'
    ? rezervacije.length
    : rezervacije.filter((r) => r.status === status).length;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.naslov}>Porudžbine</Text>
        <View style={styles.ukupnoBedz}>
          <Text style={styles.ukupnoTekst}>{rezervacije.length} ukupno</Text>
        </View>
      </View>

      {/* Filter tabovi po statusu */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterSadrzaj}
      >
        {FILTERI.map((f) => {
          const br = broji(f.id);
          const aktivan = aktivniFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, aktivan && styles.filterPillAktivna]}
              onPress={() => setAktivniFilter(f.id)}
              accessibilityLabel={`Filter: ${f.label}, ${br} rezervacija`}
              accessibilityRole="button"
              accessibilityState={{ selected: aktivan }}
            >
              <Text style={[styles.filterTekst, aktivan && styles.filterTekstAktivan]}>
                {f.label}
              </Text>
              {br > 0 && (
                <View style={[styles.filterBroj, aktivan && styles.filterBrojAktivan]}>
                  <Text style={[styles.filterBrojTekst, aktivan && styles.filterBrojTekstAktivan]}>
                    {br}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista rezervacija */}
      <FlatList
        data={filtrirane}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RezervacijaKartica
            rezervacija={item}
            onZavrsi={() => onZavrsi(item)}
            onOtkazi={() => onOtkazi(item)}
          />
        )}
        contentContainerStyle={styles.listaSadrzaj}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); ucitajSve(false); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Nema rezervacija"
            message={
              aktivniFilter === 'sve'
                ? 'Još nema rezervacija za vaše ponude.'
                : `Nema ${FILTERI.find((f) => f.id === aktivniFilter)?.label.toLowerCase()} rezervacija.`
            }
          />
        }
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  naslov: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  ukupnoBedz: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ukupnoTekst: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Filter
  filterScroll: {
    maxHeight: 48,
    marginBottom: 8,
  },
  filterSadrzaj: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
    minHeight: 36,
  },
  filterPillAktivna: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTekst: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTekstAktivan: {
    color: colors.white,
    fontWeight: '600',
  },
  filterBroj: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBrojAktivan: {
    backgroundColor: colors.white + '33',
  },
  filterBrojTekst: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterBrojTekstAktivan: {
    color: colors.white,
  },
  // Lista
  listaSadrzaj: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },
  // Kartica rezervacije
  kartica: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  karticaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kupacInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarKrug: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kupacIme: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  kupacTelefon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBedz: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusTekst: {
    fontSize: 12,
    fontWeight: '600',
  },
  ponudaRed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  ponudaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  ponudaNaziv: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  iznosKontejner: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  kolicinaTekst: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  iznosTekst: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  datumTekst: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 10,
  },
  // Akciona dugmad
  akcije: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  zavrsiDugme: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  zavrsiTekst: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  otkaziDugme: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.error + '50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.error + '08',
  },
});

export default OrdersScreen;
