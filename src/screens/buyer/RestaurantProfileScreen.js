import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { getRestaurantById } from '../../services/restaurantsService';
import { getActiveOffersByRestaurant } from '../../services/offersService';
import {
  getReviewsByRestaurant,
  addReview,
  hasUserReviewed,
  canUserReview,
} from '../../services/reviewsService';
import useAuth from '../../hooks/useAuth';
import OfferCard from '../../components/cards/OfferCard';
import ReviewCard from '../../components/cards/ReviewCard';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

// Mapa kategorija restorana na ikone i labele
const KATEGORIJA_INFO = {
  restoran: { ikona: 'restaurant-outline', labela: 'Restoran' },
  pekara: { ikona: 'cafe-outline', labela: 'Pekara' },
  kafic: { ikona: 'cup-outline', labela: 'Kafic' },
  ostalo: { ikona: 'storefront-outline', labela: 'Ostalo' },
};

const RestaurantProfileScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  // restaurantId se prosleđuje iz OfferDetailScreen ili MapScreen
  const { restaurantId } = route.params;
  const { user } = useAuth();

  const [restoran, setRestoran] = useState(null);
  const [ponude, setPonude] = useState([]);
  const [recenzije, setRecenzije] = useState([]);
  const [mozeRecenzirati, setMozeRecenzirati] = useState(false);
  const [vecRecenzirao, setVecRecenzirao] = useState(false);
  const [ucitavam, setUcitavam] = useState(true);
  const [greska, setGreska] = useState(null);

  // Stanje modala za dodavanje recenzije
  const [modalOtvoren, setModalOtvoren] = useState(false);
  const [novaOcena, setNovaOcena] = useState(0);
  const [noviKomentar, setNoviKomentar] = useState('');
  const [saljem, setSaljem] = useState(false);

  // Učitava podatke restorana, ponude i recenzije paralelno
  const ucitajPodatke = async () => {
    setUcitavam(true);
    setGreska(null);
    try {
      const [restoranPodaci, ponudePodaci, recenzijePodaci] = await Promise.all([
        getRestaurantById(restaurantId),
        getActiveOffersByRestaurant(restaurantId),
        getReviewsByRestaurant(restaurantId),
      ]);
      setRestoran(restoranPodaci);
      setPonude(ponudePodaci);
      setRecenzije(recenzijePodaci);

      // Proveri da li ulogovani kupac može ostaviti recenziju
      if (user) {
        const [moze, vec] = await Promise.all([
          canUserReview(restaurantId, user.id),
          hasUserReviewed(restaurantId, user.id),
        ]);
        setMozeRecenzirati(moze);
        setVecRecenzirao(vec);
      }
    } catch {
      setGreska('Nije moguće učitati profil restorana. Pokušaj ponovo.');
    } finally {
      setUcitavam(false);
    }
  };

  useEffect(() => {
    ucitajPodatke();
  }, [restaurantId]);

  // Izračunava prosečnu ocenu od niza recenzija
  const prosecnaOcena =
    recenzije.length > 0
      ? (recenzije.reduce((sum, r) => sum + r.ocena, 0) / recenzije.length).toFixed(1)
      : null;

  // Šalje novu recenziju i osvežava podatke
  const posaljiRecenziju = async () => {
    if (novaOcena === 0) {
      Alert.alert('Greška', 'Izaberi ocenu pre slanja.');
      return;
    }
    setSaljem(true);
    try {
      await addReview(restaurantId, user.id, novaOcena, noviKomentar);
      setModalOtvoren(false);
      setNovaOcena(0);
      setNoviKomentar('');
      setVecRecenzirao(true);
      // Osvežava listu recenzija
      const azuriraneRecenzije = await getReviewsByRestaurant(restaurantId);
      setRecenzije(azuriraneRecenzije);
    } catch {
      Alert.alert('Greška', 'Nije moguće poslati recenziju. Pokušaj ponovo.');
    } finally {
      setSaljem(false);
    }
  };

  if (ucitavam) return <LoadingIndicator />;
  if (greska) return <ErrorMessage message={greska} onRetry={ucitajPodatke} />;
  if (!restoran) return <ErrorMessage message="Restoran nije pronađen." />;

  const kategorijaInfo = KATEGORIJA_INFO[restoran.kategorija] ?? KATEGORIJA_INFO.ostalo;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero slika sa nazad dugmetom */}
        <View style={styles.heroKontejner}>
          {restoran.slika_url ? (
            <Image source={{ uri: restoran.slika_url }} style={styles.heroSlika} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="restaurant-outline" size={56} color={colors.gray} />
            </View>
          )}

          {/* Tamni gradijent overlay radi čitljivosti */}
          <View style={styles.heroOverlay} />

          {/* Nazad dugme */}
          <TouchableOpacity
            style={styles.nazadDugme}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Nazad"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Kartica sa osnovnim podacima */}
        <View style={styles.infoKartica}>
          {/* Naziv i kategorija */}
          <View style={styles.nazivRed}>
            <Text style={styles.naziv}>{restoran.naziv}</Text>
            <View style={styles.kategorijaBedz}>
              <Ionicons name={kategorijaInfo.ikona} size={12} color={colors.primary} />
              <Text style={styles.kategorijaTekst}>{kategorijaInfo.labela}</Text>
            </View>
          </View>

          {/* Adresa */}
          <View style={styles.adresaRed}>
            <Ionicons name="location-outline" size={16} color={colors.gray} />
            <Text style={styles.adresaTekst}>{restoran.adresa}</Text>
          </View>

          {/* Opis */}
          {restoran.opis ? (
            <Text style={styles.opis}>{restoran.opis}</Text>
          ) : null}

          {/* Statistike: aktivne ponude i prosečna ocena */}
          <View style={styles.statRed}>
            <View style={styles.statKartica}>
              <Text style={styles.statBroj}>{ponude.length}</Text>
              <Text style={styles.statLabela}>
                {ponude.length === 1 ? 'Aktivna ponuda' : 'Aktivnih ponuda'}
              </Text>
            </View>
            {prosecnaOcena !== null && (
              <View style={[styles.statKartica, styles.statKarticaAkcent]}>
                <View style={styles.statOcenaRed}>
                  <Ionicons name="star" size={16} color={colors.accent} />
                  <Text style={[styles.statBroj, styles.statBrojAkcent]}>
                    {prosecnaOcena}
                  </Text>
                </View>
                <Text style={[styles.statLabela, styles.statLabelaAkcent]}>
                  {recenzije.length} {recenzije.length === 1 ? 'recenzija' : 'recenzija'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sekcija ponuda */}
        <View style={styles.ponudeSekcija}>
          <Text style={styles.ponudeNaslov}>Dostupne ponude</Text>

          {ponude.length === 0 ? (
            <EmptyState
              icon="pricetag-outline"
              title="Nema aktivnih ponuda"
              subtitle="Ovaj restoran trenutno nema dostupnih ponuda."
            />
          ) : (
            ponude.map((ponuda) => (
              <OfferCard
                key={ponuda.id}
                // Dodajemo restaurants objekat jer OfferCard očekuje joined podatke
                offer={{ ...ponuda, restaurants: restoran }}
                onPress={() =>
                  navigation.navigate('OfferDetail', { offerId: ponuda.id })
                }
              />
            ))
          )}
        </View>

        {/* Sekcija recenzija */}
        <View style={styles.recenzijeSekcija}>
          <View style={styles.recenzijeZaglavlje}>
            <Text style={styles.ponudeNaslov}>Recenzije</Text>
            {/* Dugme za pisanje recenzije - prikazuje se samo ako kupac ima completed rezervaciju i još nije recenzirao */}
            {mozeRecenzirati && !vecRecenzirao && (
              <TouchableOpacity
                style={styles.recenzijaDugme}
                onPress={() => setModalOtvoren(true)}
                accessibilityLabel="Ostavi recenziju"
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={15} color={colors.white} />
                <Text style={styles.recenzijaDugmeTekst}>Ostavi recenziju</Text>
              </TouchableOpacity>
            )}
          </View>

          {recenzije.length === 0 ? (
            <EmptyState
              icon="chatbubble-outline"
              title="Nema recenzija"
              subtitle="Budi prvi koji će ostaviti recenziju za ovaj restoran."
            />
          ) : (
            recenzije.map((recenzija) => (
              <ReviewCard key={recenzija.id} review={recenzija} />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal za pisanje recenzije */}
      <Modal
        visible={modalOtvoren}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOtvoren(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalPozadina}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalKartica}>
            {/* Zaglavlje modala */}
            <View style={styles.modalZaglavlje}>
              <Text style={styles.modalNaslov}>Ostavi recenziju</Text>
              <TouchableOpacity
                onPress={() => setModalOtvoren(false)}
                accessibilityLabel="Zatvori modal"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.grayDark} />
              </TouchableOpacity>
            </View>

            {/* Naziv restorana */}
            <Text style={styles.modalRestoran}>{restoran?.naziv}</Text>

            {/* Izbor ocene: 5 zvezdica */}
            <Text style={styles.modalLabela}>Ocena</Text>
            <View style={styles.zvezdiceIzbor}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setNovaOcena(i)}
                  accessibilityLabel={`${i} zvezdica`}
                  accessibilityRole="button"
                  style={styles.zvezdaDugme}
                >
                  <Ionicons
                    name={i <= novaOcena ? 'star' : 'star-outline'}
                    size={36}
                    color={i <= novaOcena ? colors.accent : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Polje za komentar */}
            <Text style={styles.modalLabela}>Komentar (opciono)</Text>
            <TextInput
              style={styles.komentarInput}
              placeholder="Podeli svoje iskustvo sa ovim restoranom..."
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={4}
              value={noviKomentar}
              onChangeText={setNoviKomentar}
              textAlignVertical="top"
              maxLength={500}
            />

            {/* Dugme za slanje */}
            <TouchableOpacity
              style={[styles.posaljiDugme, saljem && styles.posaljiDugmeDisabled]}
              onPress={posaljiRecenziju}
              disabled={saljem}
              accessibilityLabel="Pošalji recenziju"
              accessibilityRole="button"
            >
              {saljem ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.posaljiDugmeTekst}>Pošalji recenziju</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Hero slika
  heroKontejner: {
    height: 220,
    backgroundColor: colors.grayLight,
  },
  heroSlika: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  nazadDugme: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Info kartica
  infoKartica: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  nazivRed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  naziv: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  kategorijaBedz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  kategorijaTekst: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  adresaRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  adresaTekst: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  opis: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  statRed: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statKartica: {
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statBroj: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabela: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  // Stat kartica za akcenat (ocena)
  statKarticaAkcent: {
    backgroundColor: colors.accent + '10',
  },
  statOcenaRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBrojAkcent: {
    color: colors.accent,
  },
  statLabelaAkcent: {
    color: colors.accent,
  },
  // Ponude sekcija
  ponudeSekcija: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  ponudeNaslov: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  // Recenzije sekcija
  recenzijeSekcija: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  recenzijeZaglavlje: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recenzijaDugme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  recenzijaDugmeTekst: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  // Modal za pisanje recenzije
  modalPozadina: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKartica: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalZaglavlje: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalNaslov: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalRestoran: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  modalLabela: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  // Red sa 5 zvezdica za izbor ocene - svaka zvezdica ima min 44pt tap area
  zvezdiceIzbor: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
  },
  zvezdaDugme: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  komentarInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    height: 100,
    marginBottom: 20,
  },
  posaljiDugme: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  posaljiDugmeDisabled: {
    opacity: 0.6,
  },
  posaljiDugmeTekst: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});

export default RestaurantProfileScreen;
