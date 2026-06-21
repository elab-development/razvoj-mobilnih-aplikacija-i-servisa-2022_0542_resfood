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
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { statusColors } from '../../constants/colors';
import { getMyRestaurant } from '../../services/restaurantsService';
import { getRestaurantOffers, deleteOffer } from '../../services/offersService';
import { formatRokKratko } from '../../utils/formatDate';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';


// Statusni bedž za ponudu - boja i tekst zavise od statusa
const StatusBedz = ({ status }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const konfig = {
    aktivna: { boja: statusColors.completed, tekst: 'Aktivna' },
    rasprodana: { boja: statusColors.pending, tekst: 'Rasprodana' },
    istekla: { boja: colors.gray, tekst: 'Istekla' },
  };
  const { boja, tekst } = konfig[status] ?? konfig.istekla;
  return (
    <View style={[styles.statusBedz, { backgroundColor: boja + '20' }]}>
      <View style={[styles.statusTacka, { backgroundColor: boja }]} />
      <Text style={[styles.statusTekst, { color: boja }]}>{tekst}</Text>
    </View>
  );
};

// Kartica pojedinačne ponude sa dugmadima za upravljanje
// Props: ponuda, onUredi, onObrisi
const PonudaKartica = ({ ponuda, onUredi, onObrisi }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
  <View style={styles.kartica}>
    <View style={styles.karticaGornji}>
      {/* Thumbnail slike */}
      {ponuda.slika_url ? (
        <Image source={{ uri: ponuda.slika_url }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Ionicons name="fast-food-outline" size={24} color={colors.border} />
        </View>
      )}

      {/* Sadržaj */}
      <View style={styles.karticaSadrzaj}>
        <Text style={styles.ponudaNaziv} numberOfLines={1}>{ponuda.naziv}</Text>
        <StatusBedz status={ponuda.status} />
        <View style={styles.infoRed}>
          <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.infoTekst}> {ponuda.preostala_kolicina}/{ponuda.kolicina} kom</Text>
          <Text style={styles.infoRazmak}>·</Text>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.infoTekst}> {formatRokKratko(ponuda.rok)}</Text>
        </View>
        <Text style={styles.cenaTekst}>
          {ponuda.snizena_cena.toFixed(0)} RSD
          <Text style={styles.originalCena}> ({ponuda.originalna_cena.toFixed(0)} RSD)</Text>
        </Text>
      </View>
    </View>

    {/* Akciona dugmad */}
    <View style={styles.akcije}>
      <TouchableOpacity
        style={styles.urediDugme}
        onPress={onUredi}
        accessibilityLabel={`Uredi ponudu ${ponuda.naziv}`}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <Text style={styles.urediTekst}>Uredi</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.obrisiDugme}
        onPress={onObrisi}
        accessibilityLabel={`Obriši ponudu ${ponuda.naziv}`}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={16} color={colors.error} />
        <Text style={styles.obrisiTekst}>Obriši</Text>
      </TouchableOpacity>
    </View>
  </View>
  );
};

// ─────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();

  const [restoran, setRestoran] = useState(null);
  const [ponude, setPonude] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Ref koji prati da li je inicijalno učitavanje već obavljeno
  const prvoUcitavanje = useRef(true);

  // Učitava restoran i ponude; pokaziLoader = false za tiho osvežavanje
  const ucitajSve = useCallback(async (pokaziLoader = true) => {
    if (pokaziLoader) setLoading(true);
    setError(null);
    try {
      // Dohvata restoran koji pripada ulogovanom korisniku
      const r = await getMyRestaurant(user.id);
      setRestoran(r);
      if (r) {
        // Dohvata sve ponude tog restorana
        const p = await getRestaurantOffers(r.id);
        setPonude(p);
      }
    } catch {
      setError('Greška pri učitavanju. Proveri internet konekciju.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Pri prvom fokusu učitava sa loaderom, pri povratku sa Dodaj taba tiho osvežava
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

  const onRefresh = () => {
    setRefreshing(true);
    ucitajSve(false);
  };

  // Potvrda i brisanje ponude
  const onObrisi = (ponuda) => {
    Alert.alert(
      'Obriši ponudu',
      `Da li ste sigurni da želite da obrišete "${ponuda.naziv}"?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOffer(ponuda.id);
              setPonude((prev) => prev.filter((p) => p.id !== ponuda.id));
            } catch {
              Alert.alert('Greška', 'Nije moguće obrisati ponudu. Pokušaj ponovo.');
            }
          },
        },
      ]
    );
  };

  // Navigira na AddEditOfferScreen i prosleđuje ponudu za uređivanje
  const onUredi = (ponuda) => {
    navigation.navigate('Dodaj', { ponuda });
  };

  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage message={error} onRetry={() => ucitajSve(true)} />;

  // Korisnik nema registrovan restoran - upućujemo ga na Profil tab
  if (!restoran) {
    return (
      <SafeAreaView style={styles.kontejner}>
        <View style={styles.nemaRestoranaKontejner}>
          <Ionicons name="storefront-outline" size={64} color={colors.grayLight} />
          <Text style={styles.nemaRestoranaTitle}>Nema profila restorana</Text>
          <Text style={styles.nemaRestoranaMsg}>
            Kreiraj profil svog restorana da bi mogao dodavati ponude.
          </Text>
          <TouchableOpacity
            style={styles.kreirajDugme}
            onPress={() => navigation.navigate('Profil')}
            accessibilityRole="button"
          >
            <Text style={styles.kreirajTekst}>Kreiraj profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Statistike se računaju lokalno iz liste ponuda
  const statistike = {
    aktivne: ponude.filter((p) => p.status === 'aktivna').length,
    rasprodane: ponude.filter((p) => p.status === 'rasprodana').length,
    istekle: ponude.filter((p) => p.status === 'istekla').length,
  };

  // ListHeaderComponent - header i statistike iznad liste
  const Header = () => (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header sa nazivom restorana */}
      <View style={styles.header}>
        <View style={styles.headerTekst}>
          <Text style={styles.pozdrav}>Dobrodošli,</Text>
          <Text style={styles.restaurantNaziv} numberOfLines={1}>{restoran.naziv}</Text>
          <Text style={styles.adresa} numberOfLines={1}>{restoran.adresa}</Text>
        </View>
        <View style={styles.headerIkona}>
          <Ionicons name="storefront" size={22} color={colors.primary} />
        </View>
      </View>

      {/* Statistike */}
      <View style={styles.statitikeRed}>
        <StatKartica broj={statistike.aktivne} label="Aktivne" boja={colors.success} ikona="checkmark-circle-outline" />
        <StatKartica broj={statistike.rasprodane} label="Rasprodane" boja={colors.accent} ikona="bag-check-outline" />
        <StatKartica broj={statistike.istekle} label="Istekle" boja={colors.gray} ikona="time-outline" />
      </View>

      {/* Naslov sekcije + dugme za novu ponudu */}
      <View style={styles.sekcijaNaslov}>
        <Text style={styles.sekcijaTekst}>
          Moje ponude {ponude.length > 0 && <Text style={styles.broPonuda}>({ponude.length})</Text>}
        </Text>
        <TouchableOpacity
          style={styles.dodajDugme}
          onPress={() => navigation.navigate('Dodaj')}
          accessibilityLabel="Dodaj novu ponudu"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.dodajTekst}>Nova ponuda</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.kontejner}>
      <FlatList
        data={ponude}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PonudaKartica
            ponuda={item}
            onUredi={() => onUredi(item)}
            onObrisi={() => onObrisi(item)}
          />
        )}
        ListHeaderComponent={<Header />}
        contentContainerStyle={styles.listaSadrzaj}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="fast-food-outline"
            title="Još nema ponuda"
            message="Dodaj svoju prvu ponudu i pomozi kupcima da pronađu hranu po povoljnim cenama."
          />
        }
      />
    </SafeAreaView>
  );
};

// Mala stat kartica (aktivne / rasprodane / istekle)
const StatKartica = ({ broj, label, boja, ikona }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
  <View style={styles.statKartica}>
    <View style={[styles.statIkonaKrug, { backgroundColor: boja + '15' }]}>
      <Ionicons name={ikona} size={20} color={boja} />
    </View>
    <Text style={[styles.statBroj, { color: boja }]}>{broj}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listaSadrzaj: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTekst: { flex: 1 },
  pozdrav: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  restaurantNaziv: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  adresa: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerIkona: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Statistike
  statitikeRed: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statKartica: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIkonaKrug: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statBroj: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  // Sekcija naslov + dugme
  sekcijaNaslov: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sekcijaTekst: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  broPonuda: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  dodajDugme: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  dodajTekst: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  // Offer management kartica
  kartica: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  karticaGornji: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 10,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  karticaSadrzaj: {
    flex: 1,
    gap: 4,
  },
  ponudaNaziv: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
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
  statusTacka: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTekst: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRed: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  infoTekst: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoRazmak: {
    fontSize: 12,
    color: colors.border,
    marginHorizontal: 4,
  },
  cenaTekst: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  originalCena: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
    textDecorationLine: 'line-through',
  },
  // Akciona dugmad
  akcije: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  urediDugme: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  urediTekst: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  obrisiDugme: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  obrisiTekst: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  // Nema restorana stanje
  nemaRestoranaKontejner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  nemaRestoranaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  nemaRestoranaMsg: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  kreirajDugme: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  kreirajTekst: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DashboardScreen;
