import React, { createContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';

export const ThemeContext = createContext();

// Pruža temu (boje + isDark flag) celoj aplikaciji
// overrideScheme omogućava ručno prebacivanje teme bez obzira na sistem
export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [overrideScheme, setOverrideScheme] = useState(null);

  const scheme = overrideScheme ?? systemScheme ?? 'light';
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  // Prebacuje između svetle i tamne teme
  const toggleTheme = () => setOverrideScheme(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
