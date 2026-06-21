import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import useTheme from '../../hooks/useTheme';

// Prikazuje se dok se podaci učitavaju sa Supabase-a
const LoadingIndicator = ({ message = 'Učitavanje...' }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default LoadingIndicator;
