import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { register } from '../../services/authService';
import useTheme from '../../hooks/useTheme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// Ekran za registraciju - korisnik bira tip naloga (kupac ili restoran)
// Podaci se šalju na Supabase Auth, a trigger automatski kreira profil u bazi
const RegisterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [ime, setIme] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer'); // 'buyer' ili 'restaurant'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!ime) newErrors.ime = 'Ime je obavezno';
    if (!email) newErrors.email = 'Email je obavezan';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email nije ispravan';
    if (!password) newErrors.password = 'Lozinka je obavezna';
    else if (password.length < 6) newErrors.password = 'Lozinka mora imati najmanje 6 karaktera';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Lozinke se ne poklapaju';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Registracija korisnika na Supabase - role i ime se prosleđuju kroz metadata
  // Trigger u bazi ih automatski upisuje u profiles tabelu
  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email, password, ime, role);
      Alert.alert(
        'Uspešna registracija',
        'Vaš nalog je kreiran. Možete se prijaviti.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Greška', error.message || 'Registracija nije uspela.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header sa back dugmetom */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Kreirajte nalog</Text>
          <Text style={styles.subtitle}>Pridružite se ResFood zajednici</Text>
        </View>

        <View style={styles.form}>
          {/* Izbor tipa naloga */}
          <Text style={styles.roleLabel}>Tip naloga</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'buyer' && styles.roleOptionActive]}
              onPress={() => setRole('buyer')}
            >
              <Ionicons name="person" size={20} color={role === 'buyer' ? colors.white : colors.grayDark} />
              <Text style={[styles.roleText, role === 'buyer' && styles.roleTextActive]}>Kupac</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, role === 'restaurant' && styles.roleOptionActive]}
              onPress={() => setRole('restaurant')}
            >
              <Ionicons name="storefront" size={20} color={role === 'restaurant' ? colors.white : colors.grayDark} />
              <Text style={[styles.roleText, role === 'restaurant' && styles.roleTextActive]}>Restoran</Text>
            </TouchableOpacity>
          </View>

          <Input label="Ime" value={ime} onChangeText={setIme} placeholder="Vaše ime" error={errors.ime} autoCapitalize="words" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="vas@email.com" keyboardType="email-address" error={errors.email} />
          <Input label="Lozinka" value={password} onChangeText={setPassword} placeholder="Minimum 6 karaktera" secureTextEntry error={errors.password} />
          <Input label="Potvrda lozinke" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ponovite lozinku" secureTextEntry error={errors.confirmPassword} />

          <Button title="Registruj se" onPress={handleRegister} loading={loading} style={styles.registerButton} />
        </View>

        {/* Link ka loginu */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Već imate nalog? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Prijavite se</Text>
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
    paddingTop: 60,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 16,
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
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.grayLight,
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grayDark,
  },
  roleTextActive: {
    color: colors.white,
  },
  registerButton: {
    marginTop: 8,
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

export default RegisterScreen;
