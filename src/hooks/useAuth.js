import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Hook za lak pristup auth kontekstu iz bilo kog ekrana ili komponente
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth mora biti korišćen unutar AuthProvider-a');
  return context;
};

export default useAuth;
