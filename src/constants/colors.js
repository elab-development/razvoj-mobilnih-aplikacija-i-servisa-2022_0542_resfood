// Svetla tema (podrazumevana)
export const lightColors = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  accent: '#FF6F00',
  accentLight: '#FFA000',
  background: '#F5F5F5',
  surface: '#FFFFFF',       // Pozadina kartica i panela
  white: '#FFFFFF',          // Uvek bela (tekst na obojenim dugmadima)
  black: '#212121',
  gray: '#9E9E9E',
  grayLight: '#EEEEEE',
  grayDark: '#616161',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

// Tamna tema
export const darkColors = {
  primary: '#4CAF50',        // Svetlija zelena - vidljiva na tamnoj pozadini
  primaryLight: '#66BB6A',
  primaryDark: '#2E7D32',
  accent: '#FFA000',
  accentLight: '#FFB300',
  background: '#121212',     // Materijal tamna pozadina
  surface: '#1E1E1E',        // Tamne kartice i paneli
  white: '#FFFFFF',           // Uvek bela (tekst na primarnim/akcenat elementima)
  black: '#F5F5F5',
  gray: '#757575',
  grayLight: '#2C2C2C',      // Tamna verzija grayLight (placeholder pozadine)
  grayDark: '#BDBDBD',
  error: '#EF5350',
  success: '#66BB6A',
  warning: '#FFA726',
  text: '#F0F0F0',
  textSecondary: '#9E9E9E',
  border: '#383838',
};

// Podrazumevano - svetla tema (backward compatibility)
export const colors = lightColors;

// Semantičke boje za status rezervacija - iste u light i dark temi
// (dovoljno zasićene da budu čitljive na oba pozadinska tona)
export const statusColors = {
  pending: '#FFA000',
  completed: '#388E3C',
  cancelled: '#D32F2F',
};
