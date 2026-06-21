import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { login } from '../../services/authService';
import useTheme from '../../hooks/useTheme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// Ključ pod kojim se čuvaju kredencijali u SecureStore-u
const CREDENTIALS_KEY = 'resfood_credentials';

// Login ekran - prijava emailom/lozinkom ili Face ID-om
// Face ID tok: korisnik se prijavi → app sačuva kredencijale → sledeći put Face ID povuče kredencijale i auto-prijavi
const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Proveravamo da li uređaj podržava biometriju i da li su sačuvani kredencijali
  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const saved = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    setBiometricAvailable(hasHardware && isEnrolled);
    setSavedCredentials(!!saved);
  };

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email je obavezan';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email nije ispravan';
    if (!password) newErrors.password = 'Lozinka je obavezna';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Prijava emailom i lozinkom - nakon uspešne prijave nudi čuvanje za Face ID
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);

      // Ako biometrija postoji a kredencijali nisu sačuvani, pitamo korisnika
      if (biometricAvailable && !savedCredentials) {
        Alert.alert(
          'Face ID / Biometrija',
          'Da li želite da omogućite brzu prijavu Face ID-om?',
          [
            { text: 'Ne', style: 'cancel' },
            {
              text: 'Da', onPress: async () => {
                // Čuvamo kredencijale u SecureStore (enkripcija na nivou uređaja)
                await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
              }
            },
          ]
        );
      }
      // AuthContext detektuje novu sesiju i prebacuje na pravi navigator
    } catch (error) {
      Alert.alert('Greška', 'Pogrešan email ili lozinka.');
    } finally {
      setLoading(false);
    }
  };

  // Face ID prijava - verifikuje identitet pa povlači sačuvane kredencijale i prijavljuje
  const handleBiometric = async () => {
    if (!savedCredentials) {
      Alert.alert('Face ID nije podešen', 'Prvo se prijavite emailom i lozinkom da biste aktivirali Face ID prijavu.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Prijavite se na ResFood',
      fallbackLabel: 'Koristite lozinku',
    });

    if (result.success) {
      // Face ID uspešan - povlačimo sačuvane kredencijale i prijavljujemo korisnika
      setLoading(true);
      try {
        const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
        const { email: savedEmail, password: savedPassword } = JSON.parse(stored);
        await login(savedEmail, savedPassword);
      } catch (error) {
        Alert.alert('Greška', 'Automatska prijava nije uspela. Pokušajte ručno.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="leaf" size={36} color={colors.white} />
          </View>
          <Text style={styles.title}>Dobrodošli</Text>
          <Text style={styles.subtitle}>Prijavite se na vaš nalog</Text>
        </View>

        {/* Forma */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vas@email.com"
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Lozinka"
            value={password}
            onChangeText={setPassword}
            placeholder="Unesite lozinku"
            secureTextEntry
            error={errors.password}
          />

          <Button title="Prijavi se" onPress={handleLogin} loading={loading} style={styles.loginButton} />

          {/* Face ID dugme - prikazuje se samo ako uređaj podržava biometriju */}
          {biometricAvailable && (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
              <Ionicons name="scan" size={24} color={colors.primary} />
              <Text style={styles.biometricText}>
                {savedCredentials ? 'Prijava Face ID-om' : 'Podesi Face ID prijavu'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Link ka registraciji */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Nemate nalog? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Registrujte se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButton: {
    marginTop: 8,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  biometricText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
