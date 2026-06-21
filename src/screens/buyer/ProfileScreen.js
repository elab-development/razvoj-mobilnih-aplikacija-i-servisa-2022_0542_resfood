import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { odaberiSliku } from '../../utils/imagePicker';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { updateProfile, uploadAvatar, logout } from '../../services/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ProfileScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile, refreshProfile } = useAuth();

  // Forma stanja - inicijalizuju se iz globalnog profile konteksta
  const [ime, setIme] = useState('');
  const [telefon, setTelefon] = useState('');
  const [noviAvatarUri, setNoviAvatarUri] = useState(null); // lokalni URI novoizabrane slike
  const [greske, setGreske] = useState({});
  const [cuvam, setCuvam] = useState(false);

  // Sync forme sa profilom kad se profil učita ili promeni
  useEffect(() => {
    if (profile) {
      setIme(profile.ime ?? '');
      setTelefon(profile.telefon ?? '');
    }
  }, [profile]);

  // Otvara picker za avatar - galerija ili kamera
  const onOdaberiAvatar = (kamera) => async () => {
    const uri = await odaberiSliku({ kamera, aspect: [1, 1] });
    if (uri) setNoviAvatarUri(uri);
  };

  const prikaziPickerMeni = () => {
    Alert.alert('Promeni profilnu sliku', 'Odaberi izvor', [
      { text: 'Galerija', onPress: onOdaberiAvatar(false) },
      { text: 'Kamera', onPress: onOdaberiAvatar(true) },
      ...(noviAvatarUri || profile?.avatar_url
        ? [{ text: 'Ukloni sliku', style: 'destructive', onPress: () => setNoviAvatarUri('remove') }]
        : []),
      { text: 'Otkaži', style: 'cancel' },
    ]);
  };

  // Validira formu i vraća objekat grešaka
  const validiraj = () => {
    const errs = {};
    if (!ime.trim()) errs.ime = 'Ime je obavezno';
    return errs;
  };

  // Čuva izmene profila
  const onSacuvaj = async () => {
    const errs = validiraj();
    if (Object.keys(errs).length > 0) {
      setGreske(errs);
      return;
    }

    setCuvam(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;

      // Uploadujemo novi avatar ako je odabran
      if (noviAvatarUri && noviAvatarUri !== 'remove') {
        avatarUrl = await uploadAvatar(noviAvatarUri, user.id);
      } else if (noviAvatarUri === 'remove') {
        avatarUrl = null;
      }

      // Ažuriramo profil u bazi
      await updateProfile(user.id, {
        ime: ime.trim(),
        telefon: telefon.trim() || null,
        avatar_url: avatarUrl,
      });

      // Osvežavamo globalni profil u AuthContext-u
      await refreshProfile();
      setNoviAvatarUri(null);

      Alert.alert('Uspešno!', 'Profil je ažuriran.');
    } catch {
      Alert.alert('Greška', 'Nije moguće sačuvati profil. Pokušaj ponovo.');
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

  // Određuje koji URI da prikaže kao avatar
  const avatarPrikaz = noviAvatarUri && noviAvatarUri !== 'remove'
    ? noviAvatarUri
    : noviAvatarUri === 'remove'
    ? null
    : profile?.avatar_url ?? null;

  const imaPromena = ime !== (profile?.ime ?? '') ||
    telefon !== (profile?.telefon ?? '') ||
    noviAvatarUri !== null;

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
            <Text style={styles.naslov}>Profil</Text>
          </View>

          {/* Avatar sekcija */}
          <View style={styles.avatarSekcija}>
            <TouchableOpacity
              style={styles.avatarKontejner}
              onPress={prikaziPickerMeni}
              activeOpacity={0.85}
              accessibilityLabel="Promeni profilnu sliku"
              accessibilityRole="button"
            >
              {avatarPrikaz ? (
                <Image source={{ uri: avatarPrikaz }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color={colors.gray} />
                </View>
              )}
              {/* Kamera ikona overlay */}
              <View style={styles.kameraIkona}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>

            <Text style={styles.avatarIme}>{profile?.ime ?? ''}</Text>
            <Text style={styles.avatarEmail}>{user?.email ?? ''}</Text>

            {/* Role bedž - čita se iz profila */}
            <View style={styles.roleBedz}>
              <Ionicons name="person-outline" size={12} color={colors.primary} />
              <Text style={styles.roleTekst}>
                {profile?.role === 'restaurant' ? 'Restoran' : 'Kupac'}
              </Text>
            </View>
          </View>

          {/* Forma - lični podaci */}
          <View style={styles.sekcija}>
            <Text style={styles.sekcijaTitle}>Lični podaci</Text>

            <Input
              label="Ime i prezime"
              value={ime}
              onChangeText={(v) => { setIme(v); setGreske((g) => ({ ...g, ime: undefined })); }}
              placeholder="Vaše ime i prezime"
              autoCapitalize="words"
              error={greske.ime}
            />

            <Input
              label="Broj telefona"
              value={telefon}
              onChangeText={setTelefon}
              placeholder="+381 60 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            {/* Email je read-only - menja se kroz Supabase Auth */}
            <View style={styles.emailKontejner}>
              <Text style={styles.emailLabel}>Email adresa</Text>
              <View style={styles.emailPrikaz}>
                <Ionicons name="mail-outline" size={16} color={colors.gray} />
                <Text style={styles.emailTekst}>{user?.email ?? ''}</Text>
                <View style={styles.zakljucanoIkona}>
                  <Ionicons name="lock-closed" size={12} color={colors.gray} />
                </View>
              </View>
              <Text style={styles.emailNapomena}>Email se ne može menjati</Text>
            </View>
          </View>

          {/* Sačuvaj dugme */}
          <Button
            title="Sačuvaj izmene"
            onPress={onSacuvaj}
            loading={cuvam}
            disabled={!imaPromena}
            style={styles.sacuvajDugme}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sekcija naloga */}
          <View style={styles.sekcija}>
            <Text style={styles.sekcijaTitle}>Nalog</Text>

            {/* Dark mode toggle */}
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

            <View style={styles.divider} />

            {/* Info red - registrovan od */}
            <View style={styles.infoRed}>
              <View style={styles.infoIkona}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Član od</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  naslov: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  // Avatar sekcija
  avatarSekcija: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarKontejner: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  kameraIkona: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarIme: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  avatarEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleBedz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleTekst: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  // Forme sekcije
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
  // Email read-only
  emailKontejner: {
    marginBottom: 4,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  emailPrikaz: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  emailTekst: {
    flex: 1,
    fontSize: 15,
    color: colors.grayDark,
  },
  zakljucanoIkona: {
    padding: 2,
  },
  emailNapomena: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
    marginLeft: 2,
  },
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
  // Info redovi u "Nalog" sekciji
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
    marginBottom: 12,
  },
  // Logout - odvojen od ostatka (destructive action odvojen vizuelno i prostorno)
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

export default ProfileScreen;
