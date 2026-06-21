import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';

// Prikazuje se kada lista nema podataka (npr. nema ponuda, nema rezervacija...)
// Props: icon - naziv Ionicons ikone, title, message (ili subtitle kao alias)
const EmptyState = ({ icon = 'file-tray-outline', title = 'Nema podataka', message, subtitle }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={colors.grayLight} />
      <Text style={styles.title}>{title}</Text>
      {(message || subtitle) && <Text style={styles.message}>{message ?? subtitle}</Text>}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.grayDark,
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});

export default EmptyState;
