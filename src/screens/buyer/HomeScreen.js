import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { getActiveOffers } from '../../services/offersService';
import OfferCard from '../../components/cards/OfferCard';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

// Kategorije za filter - id mora da odgovara vrednostima u bazi
const KATEGORIJE = [
  { id: 'sve', label: 'Sve' },
  { id: 'rucak', label: 'Ručak' },
  { id: 'pecivo', label: 'Pecivo' },
  { id: 'desert', label: 'Desert' },
  { id: 'napitak', label: 'Napitak' },
  { id: 'ostalo', label: 'Ostalo' },
];

// Vraća pozdrav prema dobu dana, sa imenom korisnika ako je dostupno
const getPozdrav = (ime) => {
  const sat = new Date().getHours();
  let pozdrav;
  if (sat < 12) pozdrav = 'Dobro jutro';
  else if (sat < 18) pozdrav = 'Dobar dan';
  else pozdrav = 'Dobro veče';
  // Koristimo samo ime (bez prezimena) ako postoji
  const kratkoIme = ime ? ime.split(' ')[0] : null;
  return kratkoIme ? `${pozdrav}, ${kratkoIme}!` : `${pozdrav}!`;
};

const HomeScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  // Profil korisnika iz globalnog auth konteksta (ime, rola...)
  const { profile } = useAuth();

  const [ponude, setPonude] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [aktivnaKategorija, setAktivnaKategorija] = useState('sve');

  // Dohvata ponude sa Supabase-a, prima kategoriju kao parametar
  const ucitajPonude = useCallback(async (kategorija) => {
    try {
      setError(null);
      const data = await getActiveOffers(kategorija);
      setPonude(data);
    } catch (err) {
      setError('Greška pri učitavanju ponuda. Proveri internet konekciju i pokušaj ponovo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pokreće učitavanje svaki put kada se promeni kategorija
  useEffect(() => {
    setLoading(true);
    ucitajPonude(aktivnaKategorija);
  }, [aktivnaKategorija]);

  // Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    ucitajPonude(aktivnaKategorija);
  };

  // Prelazi na OfferDetailScreen, prosleđuje ID ponude
  const onPonudaPress = (offerId) => {
    navigation.navigate('OfferDetail', { offerId });
  };

  if (loading) return <LoadingIndicator />;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header sa pozdravom */}
      <View style={styles.header}>
        <View style={styles.headerTekst}>
          <Text style={styles.pozdrav}>{getPozdrav(profile?.ime)}</Text>
          <Text style={styles.podnaslov}>Pronađi hranu po povoljnim cenama</Text>
        </View>
        <View style={styles.headerIkona}>
          <Ionicons name="leaf" size={22} color={colors.primary} accessible={false} />
        </View>
      </View>

      {/* Horizontalni scroll filter po kategorijama */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterSadrzaj}
      >
        {KATEGORIJE.map((kat) => (
          <TouchableOpacity
            key={kat.id}
            style={[
              styles.filterPill,
              aktivnaKategorija === kat.id && styles.filterPillAktivna,
            ]}
            onPress={() => setAktivnaKategorija(kat.id)}
            accessibilityLabel={`Filter po kategoriji: ${kat.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: aktivnaKategorija === kat.id }}
          >
            <Text
              style={[
                styles.filterTekst,
                aktivnaKategorija === kat.id && styles.filterTekstAktivan,
              ]}
            >
              {kat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Poruka o grešci */}
      {error && <ErrorMessage message={error} />}

      {/* Lista ponuda */}
      <FlatList
        data={ponude}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            onPress={() => onPonudaPress(item.id)}
          />
        )}
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
          !error ? (
            <EmptyState
              icon="fast-food-outline"
              title="Nema aktivnih ponuda"
              message="Trenutno nema dostupnih ponuda u ovoj kategoriji. Povuci nadole da osvežiš."
            />
          ) : null
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTekst: {
    flex: 1,
  },
  pozdrav: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  podnaslov: {
    fontSize: 13,
    color: colors.textSecondary,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    // Minimalna visina za touch target (Apple HIG: 44pt)
    minHeight: 44,
    justifyContent: 'center',
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
  listaSadrzaj: {
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
});

export default HomeScreen;
