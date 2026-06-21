import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';

// Kartica ponude - prikazuje se na HomeScreen i DashboardScreen
// Props:
//   offer - objekat ponude sa ugnježdenim restaurants objektom
//   onPress - callback kada korisnik tapne karticu
const OfferCard = ({ offer, onPress }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // Izračunavamo procenat popusta
  const popust = Math.round(
    ((offer.originalna_cena - offer.snizena_cena) / offer.originalna_cena) * 100
  );

  // Formatira preostalo vreme do isteka ponude
  const getPreostaloVreme = () => {
    const razlika = new Date(offer.rok) - new Date();
    if (razlika <= 0) return 'Isteklo';
    const sati = Math.floor(razlika / (1000 * 60 * 60));
    if (sati < 1) return `${Math.floor(razlika / 60000)}min`;
    if (sati < 24) return `${sati}h`;
    return `${Math.floor(sati / 24)}d`;
  };

  return (
    <TouchableOpacity
      style={styles.kartica}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`${offer.naziv}, ${offer.snizena_cena} RSD, restoran ${offer.restaurants?.naziv}`}
      accessibilityRole="button"
    >
      {/* Slika ponude */}
      <View style={styles.slikaKontejner}>
        {offer.slika_url ? (
          <Image
            source={{ uri: offer.slika_url }}
            style={styles.slika}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.slika, styles.slikaPlaceholder]}>
            <Ionicons name="fast-food-outline" size={44} color={colors.border} />
          </View>
        )}

        {/* Bedž sa popustom - narandžasti, gornji desni ugao */}
        <View style={styles.popustBedz}>
          <Text style={styles.popustTekst}>-{popust}%</Text>
        </View>

        {/* Preostalo vreme - donji levi ugao */}
        <View style={styles.vremeBedz}>
          <Ionicons name="time-outline" size={12} color={colors.white} />
          <Text style={styles.vremeTekst}> {getPreostaloVreme()}</Text>
        </View>
      </View>

      {/* Tekstualni sadržaj */}
      <View style={styles.sadrzaj}>
        {/* Naziv restorana */}
        <Text style={styles.restaurantNaziv} numberOfLines={1}>
          {offer.restaurants?.naziv ?? 'Restoran'}
        </Text>

        {/* Naziv ponude */}
        <Text style={styles.ponudaNaziv} numberOfLines={2}>
          {offer.naziv}
        </Text>

        {/* Cene i preostala količina */}
        <View style={styles.dnoRed}>
          <View>
            <Text style={styles.originalCena}>{offer.originalna_cena.toFixed(0)} RSD</Text>
            <Text style={styles.snizenaCena}>{offer.snizena_cena.toFixed(0)} RSD</Text>
          </View>
          <View style={styles.kolicinaBedz}>
            <Ionicons name="cube-outline" size={13} color={colors.primary} />
            <Text style={styles.kolicinaTekst}> {offer.preostala_kolicina} kom</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kartica: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    // Senka za iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    // Senka za Android
    elevation: 3,
    overflow: 'hidden',
  },
  slikaKontejner: {
    position: 'relative',
  },
  slika: {
    width: '100%',
    height: 160,
  },
  slikaPlaceholder: {
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popustBedz: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popustTekst: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  vremeBedz: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vremeTekst: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  sadrzaj: {
    padding: 12,
  },
  restaurantNaziv: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  ponudaNaziv: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    lineHeight: 20,
  },
  dnoRed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  originalCena: {
    fontSize: 12,
    color: colors.gray,
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  snizenaCena: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  kolicinaBedz: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kolicinaTekst: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default OfferCard;
