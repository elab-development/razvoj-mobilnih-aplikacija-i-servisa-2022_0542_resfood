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
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { statusColors } from '../../constants/colors';
import { getBuyerReservations, cancelReservation, updateReservationStatus } from '../../services/reservationsService';
import { formatDatum, formatRokKratko } from '../../utils/formatDate';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

const FILTERI = [
  { id: 'sve', label: 'Sve' },
  { id: 'pending', label: 'Na čekanju' },
  { id: 'completed', label: 'Završene' },
  { id: 'cancelled', label: 'Otkazane' },
];

const STATUS_KONFIG = {
  pending: { boja: statusColors.pending, ikona: 'time-outline', tekst: 'Na čekanju' },
  completed: { boja: statusColors.completed, ikona: 'checkmark-circle-outline', tekst: 'Završena' },
  cancelled: { boja: statusColors.cancelled, ikona: 'close-circle-outline', tekst: 'Otkazana' },
};


// ─────────────────────────────────────────────

// Kartica jedne rezervacije sa buyer perspektive
// Props: rezervacija, onOtkazi, onPreuzmi
const RezervacijaKartica = ({ rezervacija, onOtkazi, onPreuzmi }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const konfig = STATUS_KONFIG[rezervacija.status] ?? STATUS_KONFIG.pending;
  const ponuda = rezervacija.offers;
  const restoran = ponuda?.restaurants;
  const ukupno = (rezervacija.kolicina * (ponuda?.snizena_cena ?? 0)).toFixed(0);
  const isPending = rezervacija.status === 'pending';

  return (
    <View style={styles.kartica}>
      <View style={styles.karticaGornji}>
        {/* Thumbnail slike ponude */}
        {ponuda?.slika_url ? (
          <Image source={{ uri: ponuda.slika_url }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="fast-food-outline" size={24} color={colors.border} />
          </View>
        )}

        {/* Sadržaj */}
        <View style={styles.sadrzaj}>
          {/* Status bedž */}
          <View style={[styles.statusBedz, { backgroundColor: konfig.boja + '18' }]}>
            <Ionicons name={konfig.ikona} size={12} color={konfig.boja} />
            <Text style={[styles.statusTekst, { color: konfig.boja }]}>{konfig.tekst}</Text>
          </View>

          {/* Naziv ponude */}
          <Text style={styles.ponudaNaziv} numberOfLines={2}>
            {ponuda?.naziv ?? 'Nepoznata ponuda'}
          </Text>

          {/* Restoran */}
          <View style={styles.restaurantRed}>
            <Ionicons name="storefront-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.restaurantNaziv} numberOfLines={1}>
              {restoran?.naziv ?? '—'}
            </Text>
          </View>

          {/* Adresa */}
          {restoran?.adresa ? (
            <View style={styles.adresaRed}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.adresaTekst} numberOfLines={1}>{restoran.adresa}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Info red: količina, cena, rok */}
      <View style={styles.infoRed}>
        <View style={styles.infoGrupa}>
          <Text style={styles.infoLabel}>Količina</Text>
          <Text style={styles.infoVrednost}>{rezervacija.kolicina} kom</Text>
        </View>
        <View style={styles.infoDelimiter} />
        <View style={styles.infoGrupa}>
          <Text style={styles.infoLabel}>Ukupno</Text>
          <Text style={[styles.infoVrednost, { color: colors.primary }]}>{ukupno} RSD</Text>
        </View>
        <View style={styles.infoDelimiter} />
        <View style={styles.infoGrupa}>
          <Text style={styles.infoLabel}>Rok preuzimanja</Text>
          <Text style={styles.infoVrednost}>{ponuda?.rok ? formatRokKratko(ponuda.rok) : '—'}</Text>
        </View>
      </View>

      {/* Datum rezervacije */}
      <Text style={styles.datumTekst}>Rezervisano: {formatDatum(rezervacija.created_at)}</Text>

      {/* Dugmad za akcije - samo za pending */}
      {isPending && (
        <View style={styles.akcijeRed}>
          <TouchableOpacity
            style={styles.preuzimiDugme}
            onPress={onPreuzmi}
            accessibilityLabel={`Označi kao preuzeto: ${ponuda?.naziv}`}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
            <Text style={styles.preuzimiTekst}>Preuzeo sam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.otkaziDugme}
            onPress={onOtkazi}
            accessibilityLabel={`Otkaži rezervaciju za ${ponuda?.naziv}`}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={16} color={colors.error} />
            <Text style={styles.otkaziTekst}>Otkaži</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────

const ReservationsScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();

  const [rezervacije, setRezervacije] = useState([]);
  const [aktivniFilter, setAktivniFilter] = useState('sve');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const prvoUcitavanje = useRef(true);

  // Dohvata rezervacije kupca; pokaziLoader = false za tiho osvežavanje
  const ucitaj = useCallback(async (pokaziLoader = true) => {
    if (pokaziLoader) setLoading(true);
    setError(null);
    try {
      // Dohvata sve rezervacije ulogovanog kupca sa podacima ponude i restorana
      const data = await getBuyerReservations(user.id);
      setRezervacije(data);
    } catch {
      setError('Greška pri učitavanju rezervacija. Proveri internet konekciju.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Inicijalno učitavanje sa loaderom, tiho osvežavanje pri povratku na tab
  useFocusEffect(
    useCallback(() => {
      if (prvoUcitavanje.current) {
        prvoUcitavanje.current = false;
        ucitaj(true);
      } else {
        ucitaj(false);
      }
    }, [ucitaj])
  );

  // Označava rezervaciju kao preuzetu uz potvrdu
  const onPreuzmi = (rezervacija) => {
    Alert.alert(
      'Potvrdi preuzimanje',
      `Da li ste preuzeli "${rezervacija.offers?.naziv}" iz restorana ${rezervacija.offers?.restaurants?.naziv}?`,
      [
        { text: 'Nazad', style: 'cancel' },
        {
          text: 'Da, preuzeo sam',
          onPress: async () => {
            try {
              await updateReservationStatus(rezervacija.id, 'completed');
              // Lokalno ažuriramo status bez ponovnog fetch-a
              setRezervacije((prev) =>
                prev.map((r) =>
                  r.id === rezervacija.id ? { ...r, status: 'completed' } : r
                )
              );
            } catch {
              Alert.alert('Greška', 'Nije moguće ažurirati rezervaciju. Pokušaj ponovo.');
            }
          },
        },
      ]
    );
  };

  // Otkazuje rezervaciju uz potvrdu
  const onOtkazi = (rezervacija) => {
    Alert.alert(
      'Otkaži rezervaciju',
      `Da li ste sigurni da želite da otkažete rezervaciju za "${rezervacija.offers?.naziv}"?`,
      [
        { text: 'Nazad', style: 'cancel' },
        {
          text: 'Otkaži',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(rezervacija.id);
              // Lokalno ažuriramo status bez ponovnog fetch-a
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
  if (error) return <ErrorMessage message={error} onRetry={() => ucitaj(true)} />;

  // Filtrira prema odabranom statusu
  const filtrirane = aktivniFilter === 'sve'
    ? rezervacije
    : rezervacije.filter((r) => r.status === aktivniFilter);

  const broji = (status) =>
    status === 'sve' ? rezervacije.length : rezervacije.filter((r) => r.status === status).length;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.naslov}>Moje rezervacije</Text>
        {rezervacije.length > 0 && (
          <View style={styles.ukupnoBedz}>
            <Text style={styles.ukupnoTekst}>{rezervacije.length} ukupno</Text>
          </View>
        )}
      </View>

      {/* Filter tabovi */}
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
              accessibilityLabel={`Filter: ${f.label}, ${br}`}
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
            onPreuzmi={() => onPreuzmi(item)}
            onOtkazi={() => onOtkazi(item)}
          />
        )}
        contentContainerStyle={styles.listaSadrzaj}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); ucitaj(false); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={aktivniFilter === 'sve' ? 'Još nema rezervacija' : 'Nema rezervacija'}
            message={
              aktivniFilter === 'sve'
                ? 'Kada rezervišeš ponudu, ovde ćeš videti sve svoje rezervacije.'
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
    backgroundColor: 'rgba(255,255,255,0.25)',
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
  // Kartica
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
  karticaGornji: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sadrzaj: {
    flex: 1,
    gap: 4,
  },
  statusBedz: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusTekst: {
    fontSize: 11,
    fontWeight: '600',
  },
  ponudaNaziv: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  restaurantRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restaurantNaziv: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  adresaRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adresaTekst: {
    fontSize: 12,
    color: colors.gray,
    flex: 1,
  },
  // Info red: količina, ukupno, rok
  infoRed: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  infoGrupa: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  infoDelimiter: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.gray,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoVrednost: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  datumTekst: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 10,
  },
  akcijeRed: {
    flexDirection: 'row',
    gap: 8,
  },
  preuzimiDugme: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    gap: 6,
  },
  preuzimiTekst: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  otkaziDugme: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '06',
    gap: 6,
  },
  otkaziTekst: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});

export default ReservationsScreen;
