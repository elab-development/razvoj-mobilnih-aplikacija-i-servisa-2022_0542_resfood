import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

// Hook za pristup trenutnoj temi (boje, isDark, toggleTheme)
const useTheme = () => useContext(ThemeContext);

export default useTheme;
