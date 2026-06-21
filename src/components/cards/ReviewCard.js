import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';

// Formatira datum u čitljiv format (npr. "12. jun 2025.")
const formatirajDatum = (isoString) => {
  const datum = new Date(isoString);
  return datum.toLocaleDateString('sr-RS', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Prikazuje red zvezdica na osnovu ocene (1-5)
const Zvezdice = ({ ocena, colors }) => (
  <View style={zvezdiceStyles.red}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= ocena ? 'star' : 'star-outline'}
        size={14}
        color={i <= ocena ? colors.accent : colors.border}
        style={{ marginRight: 2 }}
      />
    ))}
  </View>
);

const zvezdiceStyles = StyleSheet.create({
  red: { flexDirection: 'row', alignItems: 'center' },
});

// Kartica recenzije - prikazuje se u sekciji recenzija na RestaurantProfileScreen
// Props:
//   review - objekat recenzije sa ugnježdenim profiles objektom (ime kupca)
const ReviewCard = ({ review }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // Ime kupca dolazi iz joined profiles tabele
  const imePrezime = review.profiles?.ime ?? 'Anonimni korisnik';

  return (
    <View style={styles.kartica}>
      {/* Gornji red: inicijal + ime + datum */}
      <View style={styles.zaglavljeRed}>
        <View style={styles.avatar}>
          <Text style={styles.avatarSlovo}>{imePrezime.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.zaglavljeInfo}>
          <Text style={styles.ime}>{imePrezime}</Text>
          <Text style={styles.datum}>{formatirajDatum(review.created_at)}</Text>
        </View>
        <Zvezdice ocena={review.ocena} colors={colors} />
      </View>

      {/* Komentar (opciono) */}
      {review.komentar ? (
        <Text style={styles.komentar}>{review.komentar}</Text>
      ) : null}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kartica: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    // Senka za iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    // Senka za Android
    elevation: 2,
  },
  zaglavljeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Kružni avatar sa početnim slovom imena
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSlovo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  zaglavljeInfo: {
    flex: 1,
  },
  ime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  datum: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  komentar: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default ReviewCard;
