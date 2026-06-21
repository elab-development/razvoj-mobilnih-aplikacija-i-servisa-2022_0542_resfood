import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { odaberiSliku } from '../../utils/imagePicker';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import {
  getMyRestaurant,
  createRestaurant,
  updateRestaurant,
  uploadRestaurantImage,
} from '../../services/restaurantsService';
import { logout } from '../../services/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorMessage from '../../components/common/ErrorMessage';

// Dostupne kategorije restorana
const KATEGORIJE = ['restoran', 'pekara', 'kafic', 'ostalo'];
const KATEGORIJA_LABELE = {
  restoran: 'Restoran',
  pekara: 'Pekara',
  kafic: 'Kafic',
  ostalo: 'Ostalo',
};

const RestaurantProfileEditScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile } = useAuth();

  // Stanje učitavanja podataka restorana
  const [ucitavam, setUcitavam] = useState(true);
  const [greska, setGreska] = useState(null);

  // Podatak o restoranu iz baze (null = nema još)
  const [restoran, setRestoran] = useState(null);

  // Forma stanja
  const [naziv, setNaziv] = useState('');
  const [adresa, setAdresa] = useState('');
  const [opis, setOpis] = useState('');
  const [kategorija, setKategorija] = useState('restoran');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Slika restorana - lokalni URI novoizabrane slike
  const [novaSlika, setNovaSlika] = useState(null);

  // Greške validacije
  const [greske, setGreske] = useState({});

  // Stanje čuvanja
  const [cuvam, setCuvam] = useState(false);

  // Stanje učitavanja GPS lokacije
  const [ucitavamLokaciju, setUcitavamLokaciju] = useState(false);

  // Ref za prvu fokus (prikazuje spinner samo pri prvom otvaranju)
  const prvoUcitavanje = useRef(true);

  // Učitava podatke o restoranu vlasnika
  const ucitajRestoran = useCallback(async (prikaziSpinner = false) => {
    if (prikaziSpinner) setUcitavam(true);
    setGreska(null);
    try {
      const podaci = await getMyRestaurant(user.id);
      setRestoran(podaci);
      if (podaci) {
        popuniFormu(podaci);
      }
    } catch (err) {
      setGreska('Nije moguće učitati podatke. Pokušaj ponovo.');
    } finally {
      setUcitavam(false);
    }
  }, [user.id]);

  // Popunjava formu podacima iz baze
  const popuniFormu = (podaci) => {
    setNaziv(podaci.naziv ?? '');
    setAdresa(podaci.adresa ?? '');
    setOpis(podaci.opis ?? '');
    setKategorija(podaci.kategorija ?? 'restoran');
    setLatitude(podaci.latitude ?? null);
    setLongitude(podaci.longitude ?? null);
    setNovaSlika(null);
  };

  // useFocusEffect - spinner samo pri prvom otvaranju, tiho osvežavanje pri povratku
  useFocusEffect(
    useCallback(() => {
      if (prvoUcitavanje.current) {
        prvoUcitavanje.current = false;
        ucitajRestoran(true);
      } else {
        ucitajRestoran(false);
      }
    }, [ucitajRestoran])
  );

  // Otvara picker za sliku restorana
  const onOdaberiSliku = (kamera) => async () => {
    const uri = await odaberiSliku({ kamera, aspect: [16, 9] });
    if (uri) setNovaSlika(uri);
  };

  const prikaziPickerMeni = () => {
    Alert.alert('Slika restorana', 'Odaberi izvor', [
      { text: 'Galerija', onPress: onOdaberiSliku(false) },
      { text: 'Kamera', onPress: onOdaberiSliku(true) },
      { text: 'Otkaži', style: 'cancel' },
    ]);
  };

  // Automatski određuje GPS lokaciju uređaja
  const odrediLokaciju = async () => {
    setUcitavamLokaciju(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Potrebna dozvola za pristup lokaciji.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      Alert.alert('Uspešno', 'Lokacija je određena.');
    } catch {
      Alert.alert('Greška', 'Nije moguće odrediti lokaciju. Pokušaj ponovo.');
    } finally {
      setUcitavamLokaciju(false);
    }
  };

  // Validira formu i vraća objekat grešaka
  const validiraj = () => {
    const errs = {};
    if (!naziv.trim()) errs.naziv = 'Naziv je obavezan';
    if (!adresa.trim()) errs.adresa = 'Adresa je obavezna';
    return errs;
  };

  // Čuva izmene ili kreira novi restoran
  const onSacuvaj = async () => {
    const errs = validiraj();
    if (Object.keys(errs).length > 0) {
      setGreske(errs);
      return;
    }

    setCuvam(true);
    try {
      const podaci = {
        naziv: naziv.trim(),
        adresa: adresa.trim(),
        opis: opis.trim() || null,
        kategorija,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      };

      if (restoran) {
        // Ažuriranje postojećeg restorana
        let slikaUrl = restoran.slika_url ?? null;
        // Uploadujemo novu sliku tek ovde kada znamo pravi restoran.id
        if (novaSlika) {
          slikaUrl = await uploadRestaurantImage(novaSlika, restoran.id);
        }
        const azuriran = await updateRestaurant(restoran.id, { ...podaci, slika_url: slikaUrl });
        setRestoran(azuriran);
        setNovaSlika(null);
        Alert.alert('Uspešno!', 'Podaci restorana su ažurirani.');
      } else {
        // Kreiranje novog restorana - prvo kreiramo bez slike da dobijemo pravi ID
        const novi = await createRestaurant({ ...podaci, owner_id: user.id, slika_url: null });

        // Uploadujemo sliku sa pravim restoran.id (ne user.id) i odmah ažuriramo
        if (novaSlika) {
          const slikaUrl = await uploadRestaurantImage(novaSlika, novi.id);
          await updateRestaurant(novi.id, { slika_url: slikaUrl });
          novi.slika_url = slikaUrl;
        }

        setRestoran(novi);
        setNovaSlika(null);
        Alert.alert('Uspešno!', 'Restoran je kreiran.');
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće sačuvati podatke. Pokušaj ponovo.');
    } finally {
      setCuvam(false);
    }
  };

  // Odjava sa potvrdom
  const onLogout = () => {
    Alert.alert('Odjava', 'Da li ste sigurni da se želite odjaviti?', [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Odjavi se',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            // AuthContext detektuje promenu sesije i navigira na Login
          } catch {
            Alert.alert('Greška', 'Nije moguće odjaviti se. Pokušaj ponovo.');
          }
        },
      },
    ]);
  };

  // URI slike za prikaz (nova lokalna ili postojeća iz baze)
  const slikaPrikaz = novaSlika ?? restoran?.slika_url ?? null;

  // Da li postoje izmene u odnosu na sačuvane podatke
  const imaPromena = !restoran ||
    naziv !== (restoran?.naziv ?? '') ||
    adresa !== (restoran?.adresa ?? '') ||
    opis !== (restoran?.opis ?? '') ||
    kategorija !== (restoran?.kategorija ?? 'restoran') ||
    latitude !== (restoran?.latitude ?? null) ||
    longitude !== (restoran?.longitude ?? null) ||
    novaSlika !== null;

  if (ucitavam) return <LoadingIndicator />;
  if (greska) return <ErrorMessage message={greska} onRetry={() => ucitajRestoran(true)} />;

  return (
    <SafeAreaView style={styles.kontejner}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.naslov}>Profil restorana</Text>
            {!restoran && (
              <View style={styles.noviBedz}>
                <Text style={styles.noviBedzTekst}>Novo</Text>
              </View>
            )}
          </View>

          {/* Slika restorana */}
          <TouchableOpacity
            style={styles.slikaKontejner}
            onPress={prikaziPickerMeni}
            activeOpacity={0.85}
            accessibilityLabel="Promeni sliku restorana"
            accessibilityRole="button"
          >
            {slikaPrikaz ? (
              <Image source={{ uri: slikaPrikaz }} style={styles.slika} />
            ) : (
              <View style={styles.slikaPlaceholder}>
                <Ionicons name="restaurant-outline" size={48} color={colors.gray} />
                <Text style={styles.slikaPlaceholderTekst}>Dodaj sliku restorana</Text>
              </View>
            )}
            {/* Overlay za izmenu slike */}
            <View style={styles.slikaOverlay}>
              <Ionicons name="camera" size={18} color={colors.white} />
              <Text style={styles.slikaOverlayTekst}>
                {slikaPrikaz ? 'Promeni sliku' : 'Dodaj sliku'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Osnovni podaci restorana */}
          <View style={styles.sekcija}>
            <Text style={styles.sekcijaTitle}>Podaci restorana</Text>

            <Input
              label="Naziv restorana"
              value={naziv}
              onChangeText={(v) => { setNaziv(v); setGreske((g) => ({ ...g, naziv: undefined })); }}
              placeholder="npr. Pekara Kod Đoke"
              autoCapitalize="words"
              error={greske.naziv}
            />

            <Input
              label="Adresa"
              value={adresa}
              onChangeText={(v) => { setAdresa(v); setGreske((g) => ({ ...g, adresa: undefined })); }}
              placeholder="npr. Knez Mihailova 12, Beograd"
              autoCapitalize="sentences"
              error={greske.adresa}
            />

            <Input
              label="Opis (opciono)"
              value={opis}
              onChangeText={setOpis}
              placeholder="Kratki opis vašeg restorana..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              inputStyle={styles.opisInput}
            />

            {/* Kategorija - pill izbornik */}
            <Text style={styles.inputLabel}>Kategorija</Text>
            <View style={styles.kategorijeRed}>
              {KATEGORIJE.map((kat) => (
                <TouchableOpacity
                  key={kat}
                  style={[
                    styles.kategorijaKapsula,
                    kategorija === kat && styles.kategorijaKapsulaAktivna,
                  ]}
                  onPress={() => setKategorija(kat)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: kategorija === kat }}
                >
                  <Text
                    style={[
                      styles.kategorijaTekst,
                      kategorija === kat && styles.kategorijaTekstAktivan,
                    ]}
                  >
                    {KATEGORIJA_LABELE[kat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* GPS Lokacija */}
          <View style={styles.sekcija}>
            <Text style={styles.sekcijaTitle}>Lokacija</Text>
            <Text style={styles.lokacijaNapomena}>
              Koordinate se koriste za prikaz na mapi. Preporučujemo automatsko određivanje.
            </Text>

            {/* Status koordinata */}
            <View style={styles.koordinateRed}>
              <View style={styles.koordinataBedz}>
                <Ionicons
                  name={latitude && longitude ? 'location' : 'location-outline'}
                  size={16}
                  color={latitude && longitude ? colors.primary : colors.gray}
                />
                <Text
                  style={[
                    styles.koordinataTekst,
                    latitude && longitude && styles.koordinataTekstAktivan,
                  ]}
                >
                  {latitude && longitude
                    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                    : 'Lokacija nije određena'}
                </Text>
              </View>

              {/* Dugme za automatsku lokaciju */}
              <TouchableOpacity
                style={styles.lokacijaDugme}
                onPress={odrediLokaciju}
                disabled={ucitavamLokaciju}
                accessibilityLabel="Odredi lokaciju automatski"
                accessibilityRole="button"
              >
                {ucitavamLokaciju ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="navigate" size={16} color={colors.primary} />
                )}
                <Text style={styles.lokacijaDugmeTekst}>
                  {ucitavamLokaciju ? 'Određujem...' : 'GPS'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sačuvaj dugme */}
          <Button
            title={restoran ? 'Sačuvaj izmene' : 'Kreiraj restoran'}
            onPress={onSacuvaj}
            loading={cuvam}
            disabled={!imaPromena}
            style={styles.sacuvajDugme}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Lični podaci vlasnika - read-only */}
          <View style={styles.sekcija}>
            <Text style={styles.sekcijaTitle}>Vlasnik</Text>

            <View style={styles.infoRed}>
              <View style={styles.infoIkona}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Ime i prezime</Text>
                <Text style={styles.infoVrednost}>{profile?.ime ?? '—'}</Text>
              </View>
            </View>

            <View style={[styles.infoRed, { marginTop: 12 }]}>
              <View style={styles.infoIkona}>
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoVrednost}>{user?.email ?? '—'}</Text>
              </View>
            </View>

            {profile?.telefon ? (
              <View style={[styles.infoRed, { marginTop: 12 }]}>
                <View style={styles.infoIkona}>
                  <Ionicons name="call-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Telefon</Text>
                  <Text style={styles.infoVrednost}>{profile.telefon}</Text>
                </View>
              </View>
            ) : null}

            {/* Datum registracije */}
            <View style={[styles.infoRed, { marginTop: 12 }]}>
              <View style={styles.infoIkona}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Nalog kreiran</Text>
                <Text style={styles.infoVrednost}>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('sr-RS', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Dark mode toggle */}
          <View style={[styles.sekcija, { marginBottom: 16 }]}>
            <Text style={styles.sekcijaTitle}>Podešavanja</Text>
            <TouchableOpacity
              style={styles.temaRed}
              onPress={toggleTheme}
              accessibilityLabel={isDark ? 'Prebaci na svetlu temu' : 'Prebaci na tamnu temu'}
              accessibilityRole="button"
            >
              <View style={styles.infoIkona}>
                <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Tema aplikacije</Text>
                <Text style={styles.infoVrednost}>{isDark ? 'Tamna tema' : 'Svetla tema'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Odjava - odvojena od ostatka (destructive action) */}
          <View style={styles.logoutSekcija}>
            <TouchableOpacity
              style={styles.logoutDugme}
              onPress={onLogout}
              accessibilityLabel="Odjavi se iz aplikacije"
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutTekst}>Odjavi se</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  // Header
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
  noviBedz: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noviBedzTekst: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  // Slika restorana
  slikaKontejner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    backgroundColor: colors.grayLight,
  },
  slika: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slikaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  slikaPlaceholderTekst: {
    fontSize: 14,
    color: colors.gray,
  },
  slikaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  slikaOverlayTekst: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  // Sekcije kartice
  sekcija: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sekcijaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  // Input komponente
  opisInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  // Kategorija pills
  kategorijeRed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kategorijaKapsula: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kategorijaKapsulaAktivna: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  kategorijaTekst: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  kategorijaTekstAktivan: {
    color: colors.primary,
    fontWeight: '600',
  },
  // GPS lokacija
  lokacijaNapomena: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  koordinateRed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  koordinataBedz: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  koordinataTekst: {
    fontSize: 13,
    color: colors.gray,
    flex: 1,
  },
  koordinataTekstAktivan: {
    color: colors.text,
  },
  lokacijaDugme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '12',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  lokacijaDugmeTekst: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  // Sačuvaj dugme
  sacuvajDugme: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  // Info redovi u "Vlasnik" sekciji
  infoRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIkona: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoVrednost: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  temaRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Logout dugme - vizuelno i prostorno odvojen od ostatka
  logoutSekcija: {
    marginHorizontal: 16,
    marginBottom: 8,
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

export default RestaurantProfileEditScreen;
