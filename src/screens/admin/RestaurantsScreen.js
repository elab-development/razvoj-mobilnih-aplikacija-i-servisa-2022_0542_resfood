import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { getAllRestaurants } from '../../services/adminService';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

// Mapa kategorija restorana na ikone
const KATEGORIJA_IKONA = {
  restoran: 'restaurant-outline',
  pekara: 'cafe-outline',
  kafic: 'cup-outline',
  ostalo: 'storefront-outline',
};

// Filter tabovi po kategoriji
const FILTERI = ['Svi', 'Restoran', 'Pekara', 'Kafic', 'Ostalo'];
const FILTER_KAT = {
  Restoran: 'restoran',
  Pekara: 'pekara',
  Kafic: 'kafic',
  Ostalo: 'ostalo',
};

// Komponenta jedne kartice restorana
const RestoranKartica = ({ restoran }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const ikona = KATEGORIJA_IKONA[restoran.kategorija] ?? 'storefront-outline';

  return (
    <View style={styles.kartica}>
      {/* Slika restorana */}
      {restoran.slika_url ? (
        <Image source={{ uri: restoran.slika_url }} style={styles.slika} />
      ) : (
        <View style={styles.slikaPlaceholder}>
          <Ionicons name={ikona} size={26} color={colors.gray} />
        </View>
      )}

      {/* Podaci */}
      <View style={styles.karticaInfo}>
        <View style={styles.nazivRed}>
          <Text style={styles.naziv} numberOfLines={1}>
            {restoran.naziv}
          </Text>
          <View style={styles.kategorijaBedz}>
            <Text style={styles.kategorijaTekst}>
              {restoran.kategorija ?? 'ostalo'}
            </Text>
          </View>
        </View>

        {/* Adresa */}
        <View style={styles.infoRed}>
          <Ionicons name="location-outline" size={13} color={colors.gray} />
          <Text style={styles.infoTekst} numberOfLines={1}>
            {restoran.adresa ?? '—'}
          </Text>
        </View>

        {/* Vlasnik */}
        <View style={styles.infoRed}>
          <Ionicons name="person-outline" size={13} color={colors.gray} />
          <Text style={styles.infoTekst} numberOfLines={1}>
            {restoran.profiles?.ime ?? 'Nepoznat vlasnik'}
          </Text>
        </View>

        {/* GPS - prikaz da li ima koordinate */}
        <View style={styles.infoRed}>
          <Ionicons
            name={restoran.latitude ? 'location' : 'location-outline'}
            size={13}
            color={restoran.latitude ? colors.primary : colors.gray}
          />
          <Text
            style={[
              styles.infoTekst,
              restoran.latitude && { color: colors.primary },
            ]}
          >
            {restoran.latitude
              ? 'Lokacija uneta'
              : 'Bez GPS koordinata'}
          </Text>
        </View>

        {/* Datum dodavanja */}
        <Text style={styles.datumTekst}>
          Dodat{' '}
          {restoran.created_at
            ? new Date(restoran.created_at).toLocaleDateString('sr-RS', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—'}
        </Text>
      </View>
    </View>
  );
};

const RestaurantsScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [sviRestorani, setSviRestorani] = useState([]);
  const [ucitavam, setUcitavam] = useState(true);
  const [greska, setGreska] = useState(null);
  const [aktivniFilter, setAktivniFilter] = useState('Svi');
  const [pretraga, setPretraga] = useState('');
  const prvoUcitavanje = useRef(true);

  const ucitajRestorane = useCallback(async (prikaziSpinner = false) => {
    if (prikaziSpinner) setUcitavam(true);
    setGreska(null);
    try {
      const podaci = await getAllRestaurants();
      setSviRestorani(podaci);
    } catch {
      setGreska('Nije moguće učitati restorane.');
    } finally {
      setUcitavam(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (prvoUcitavanje.current) {
        prvoUcitavanje.current = false;
        ucitajRestorane(true);
      } else {
        ucitajRestorane(false);
      }
    }, [ucitajRestorane])
  );

  // Filtrira restorane po kategoriji i pretrazi
  const filtriraniRestorani = sviRestorani.filter((r) => {
    const odgovaraKat =
      aktivniFilter === 'Svi' || r.kategorija === FILTER_KAT[aktivniFilter];
    const odgovaraPretrazi =
      !pretraga.trim() ||
      (r.naziv ?? '').toLowerCase().includes(pretraga.toLowerCase()) ||
      (r.adresa ?? '').toLowerCase().includes(pretraga.toLowerCase()) ||
      (r.profiles?.ime ?? '').toLowerCase().includes(pretraga.toLowerCase());
    return odgovaraKat && odgovaraPretrazi;
  });

  // Broj restorana po kategoriji
  const broji = (filter) => {
    if (filter === 'Svi') return sviRestorani.length;
    return sviRestorani.filter((r) => r.kategorija === FILTER_KAT[filter]).length;
  };

  if (ucitavam) return <LoadingIndicator />;
  if (greska) return <ErrorMessage message={greska} onRetry={() => ucitajRestorane(true)} />;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.naslov}>Restorani</Text>
        <View style={styles.ukupnoBedz}>
          <Text style={styles.ukupnoTekst}>{sviRestorani.length}</Text>
        </View>
      </View>

      {/* Pretraga */}
      <View style={styles.pretragaKontejner}>
        <Ionicons name="search-outline" size={16} color={colors.gray} style={styles.pretragaIkona} />
        <TextInput
          style={styles.pretragaInput}
          value={pretraga}
          onChangeText={setPretraga}
          placeholder="Pretraži po nazivu, adresi, vlasniku..."
          placeholderTextColor={colors.gray}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter tabovi */}
      <View style={styles.filteriKontejner}>
        {FILTERI.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              aktivniFilter === filter && styles.filterTabAktivan,
            ]}
            onPress={() => setAktivniFilter(filter)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktivniFilter === filter }}
          >
            <Text
              style={[
                styles.filterTekst,
                aktivniFilter === filter && styles.filterTekstAktivan,
              ]}
            >
              {filter}
            </Text>
            <View
              style={[
                styles.filterBroj,
                aktivniFilter === filter && styles.filterBrojAktivan,
              ]}
            >
              <Text
                style={[
                  styles.filterBrojTekst,
                  aktivniFilter === filter && styles.filterBrojTekstAktivan,
                ]}
              >
                {broji(filter)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista restorana */}
      <FlatList
        data={filtriraniRestorani}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RestoranKartica restoran={item} />}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="Nema restorana"
            subtitle={
              pretraga
                ? 'Nema rezultata za datu pretragu.'
                : 'Nema restorana u ovoj kategoriji.'
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  naslov: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  ukupnoBedz: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ukupnoTekst: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // Pretraga
  pretragaKontejner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pretragaIkona: {
    marginRight: 8,
  },
  pretragaInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  // Filter tabovi
  filteriKontejner: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabAktivan: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterTekst: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTekstAktivan: {
    color: colors.white,
    fontWeight: '600',
  },
  filterBroj: {
    backgroundColor: colors.grayLight,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterBrojAktivan: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBrojTekst: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterBrojTekstAktivan: {
    color: colors.white,
  },
  // Lista
  lista: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Restoran kartica
  kartica: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  slika: {
    width: 90,
    height: 110,
    resizeMode: 'cover',
  },
  slikaPlaceholder: {
    width: 90,
    height: 110,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  karticaInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  nazivRed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  naziv: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  kategorijaBedz: {
    backgroundColor: colors.accent + '18',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  kategorijaTekst: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'capitalize',
  },
  infoRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoTekst: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  datumTekst: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
});

export default RestaurantsScreen;
