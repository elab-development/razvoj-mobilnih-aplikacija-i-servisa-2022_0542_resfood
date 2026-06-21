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
import { getAllUsers } from '../../services/adminService';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

// Filter tabovi po roli
const FILTERI = ['Svi', 'Kupci', 'Restorani', 'Admini'];
const FILTER_ROLE = { Kupci: 'buyer', Restorani: 'restaurant', Admini: 'admin' };

// Boje i labele za role bedž
const ROLE_STIL = {
  buyer: { boja: '#2E7D32', labela: 'Kupac' },
  restaurant: { boja: '#FF6F00', labela: 'Restoran' },
  admin: { boja: '#7B1FA2', labela: 'Admin' },
};

// Komponenta jedne kartice korisnika
const KorisnikKartica = ({ korisnik }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const rolStil = ROLE_STIL[korisnik.role] ?? ROLE_STIL.buyer;
  const inicijali = (korisnik.ime ?? '?')
    .split(' ')
    .map((r) => r[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.kartica}>
      {/* Avatar */}
      {korisnik.avatar_url ? (
        <Image source={{ uri: korisnik.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: rolStil.boja + '20' }]}>
          <Text style={[styles.inicijali, { color: rolStil.boja }]}>{inicijali}</Text>
        </View>
      )}

      {/* Podaci */}
      <View style={styles.karticaInfo}>
        <View style={styles.imeRed}>
          <Text style={styles.ime} numberOfLines={1}>
            {korisnik.ime ?? '—'}
          </Text>
          <View style={[styles.roleBedz, { backgroundColor: rolStil.boja + '18' }]}>
            <Text style={[styles.roleTekst, { color: rolStil.boja }]}>{rolStil.labela}</Text>
          </View>
        </View>

        {korisnik.telefon ? (
          <View style={styles.infoRed}>
            <Ionicons name="call-outline" size={13} color={colors.gray} />
            <Text style={styles.infoTekst}>{korisnik.telefon}</Text>
          </View>
        ) : null}

        <View style={styles.infoRed}>
          <Ionicons name="calendar-outline" size={13} color={colors.gray} />
          <Text style={styles.infoTekst}>
            {korisnik.created_at
              ? new Date(korisnik.created_at).toLocaleDateString('sr-RS', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
              : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const UsersScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [sviKorisnici, setSviKorisnici] = useState([]);
  const [ucitavam, setUcitavam] = useState(true);
  const [greska, setGreska] = useState(null);
  const [aktivniFilter, setAktivniFilter] = useState('Svi');
  const [pretraga, setPretraga] = useState('');
  const prvoUcitavanje = useRef(true);

  const ucitajKorisnike = useCallback(async (prikaziSpinner = false) => {
    if (prikaziSpinner) setUcitavam(true);
    setGreska(null);
    try {
      const podaci = await getAllUsers();
      setSviKorisnici(podaci);
    } catch {
      setGreska('Nije moguće učitati korisnike.');
    } finally {
      setUcitavam(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (prvoUcitavanje.current) {
        prvoUcitavanje.current = false;
        ucitajKorisnike(true);
      } else {
        ucitajKorisnike(false);
      }
    }, [ucitajKorisnike])
  );

  // Filtrira korisnike po roli i pretrazi
  const filtriraniKorisnici = sviKorisnici.filter((k) => {
    const odgovaraRoli =
      aktivniFilter === 'Svi' || k.role === FILTER_ROLE[aktivniFilter];
    const odgovaraPretrazi =
      !pretraga.trim() ||
      (k.ime ?? '').toLowerCase().includes(pretraga.toLowerCase()) ||
      (k.telefon ?? '').includes(pretraga);
    return odgovaraRoli && odgovaraPretrazi;
  });

  // Broj korisnika po roli za prikaz u filter tabovima
  const broji = (filter) => {
    if (filter === 'Svi') return sviKorisnici.length;
    return sviKorisnici.filter((k) => k.role === FILTER_ROLE[filter]).length;
  };

  if (ucitavam) return <LoadingIndicator />;
  if (greska) return <ErrorMessage message={greska} onRetry={() => ucitajKorisnike(true)} />;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.naslov}>Korisnici</Text>
        <View style={styles.ukupnoBedz}>
          <Text style={styles.ukupnoTekst}>{sviKorisnici.length}</Text>
        </View>
      </View>

      {/* Pretraga */}
      <View style={styles.pretragaKontejner}>
        <Ionicons name="search-outline" size={16} color={colors.gray} style={styles.pretragaIkona} />
        <TextInput
          style={styles.pretragaInput}
          value={pretraga}
          onChangeText={setPretraga}
          placeholder="Pretraži po imenu ili telefonu..."
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

      {/* Lista korisnika */}
      <FlatList
        data={filtriraniKorisnici}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <KorisnikKartica korisnik={item} />}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Nema korisnika"
            subtitle={
              pretraga
                ? 'Nema rezultata za datu pretragu.'
                : 'Nema korisnika u ovoj kategoriji.'
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  // Korisnik kartica
  kartica: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inicijali: {
    fontSize: 18,
    fontWeight: '700',
  },
  karticaInfo: {
    flex: 1,
    gap: 4,
  },
  imeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ime: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  roleBedz: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleTekst: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoTekst: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default UsersScreen;
