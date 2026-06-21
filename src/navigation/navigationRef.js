import { createRef } from 'react';

// Globalni ref na NavigationContainer - koristi se za navigaciju izvan React stabla
// (npr. pri tapu na push notifikaciju dok je app u pozadini)
export const navigationRef = createRef();
