import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { statusColors } from '../../constants/colors';
import { getAdminStats } from '../../services/adminService';
import { logout } from '../../services/authService';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';

// Definicija stat kartica: ikona, boja, ključ iz stats objekta, labela
// Boje se čitaju unutar komponente jer zavise od theme - ovde samo ključevi
const STAT_KARTICE = [
  { ikona: 'people-outline', bojaKljuc: 'primary', kljuc: 'kupci', labela: 'Kupci' },
  { ikona: 'restaurant-outline', bojaKljuc: 'accent', kljuc: 'restorani', labela: 'Restorani' },
  { ikona: 'pricetag-outline', bojaKljuc: 'success', kljuc: 'aktivnePonude', labela: 'Aktivne ponude' },
  { ikona: 'time-outline', bojaKljuc: 'warning', kljuc: 'pendingRezervacije', labela: 'Na čekanju' },
];

const AdminPanelScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [ucitavam, setUcitavam] = useState(true);
  const [greska, setGreska] = useState(null);
  const prvoUcitavanje = useRef(true);

  const ucitajStats = useCallback(async (prikaziSpinner = false) => {
    if (prikaziSpinner) setUcitavam(true);
    setGreska(null);
    try {
      const podaci = await getAdminStats();
      setStats(podaci);
    } catch {
      setGreska('Nije moguće učitati statistike.');
    } finally {
      setUcitavam(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (prvoUcitavanje.current) {
        prvoUcitavanje.current = false;
        ucitajStats(true);
      } else {
        ucitajStats(false);
      }
    }, [ucitajStats])
  );

  const onLogout = () => {
    Alert.alert('Odjava', 'Da li ste sigurni da se želite odjaviti?', [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Odjavi se',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            Alert.alert('Greška', 'Nije moguće odjaviti se.');
          }
        },
      },
    ]);
  };

  if (ucitavam) return <LoadingIndicator />;
  if (greska) return <ErrorMessage message={greska} onRetry={() => ucitajStats(true)} />;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.naslov}>Admin Panel</Text>
            <Text style={styles.podnaslov}>Dobrodošao, {profile?.ime ?? 'Admin'}</Text>
          </View>
          <View style={styles.adminBedz}>
            <Ionicons name="shield-checkmark" size={14} color={colors.white} />
            <Text style={styles.adminBedzTekst}>Admin</Text>
          </View>
        </View>

        {/* Email adresa */}
        <View style={styles.emailKartica}>
          <Ionicons name="mail-outline" size={16} color={colors.gray} />
          <Text style={styles.emailTekst}>{user?.email ?? ''}</Text>
        </View>

        {/* Statistike grid */}
        <Text style={styles.sekscijaTitle}>Pregled platforme</Text>
        <View style={styles.statsGrid}>
          {STAT_KARTICE.map((kartica) => {
            const boja = colors[kartica.bojaKljuc];
            return (
              <View key={kartica.kljuc} style={styles.statKartica}>
                <View style={[styles.statIkona, { backgroundColor: boja + '18' }]}>
                  <Ionicons name={kartica.ikona} size={22} color={boja} />
                </View>
                <Text style={[styles.statBroj, { color: boja }]}>
                  {stats?.[kartica.kljuc] ?? 0}
                </Text>
                <Text style={styles.statLabela}>{kartica.labela}</Text>
              </View>
            );
          })}
        </View>

        {/* Brze akcije */}
        <Text style={styles.sekscijaTitle}>Upravljanje</Text>
        <View style={styles.akcijeSekcija}>
          <View style={styles.akcijaRed}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.akcijaTekst}>
              Korisnici i restorani se pregledaju u odgovarajućim tabovima.
            </Text>
          </View>
        </View>

        {/* Odjava */}
        <View style={styles.logoutSekcija}>
          <TouchableOpacity
            style={styles.logoutDugme}
            onPress={onLogout}
            accessibilityLabel="Odjavi se"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutTekst}>Odjavi se</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  naslov: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  podnaslov: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminBedz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  adminBedzTekst: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  emailKartica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  emailTekst: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sekscijaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  // Stats grid - 2 kolone
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginBottom: 20,
    gap: 8,
  },
  statKartica: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIkona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statBroj: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabela: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Akcije sekcija
  akcijeSekcija: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  akcijaRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  akcijaTekst: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Logout
  logoutSekcija: {
    marginHorizontal: 16,
  },
  logoutDugme: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '06',
  },
  logoutTekst: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
});

export default AdminPanelScreen;
