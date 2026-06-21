import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { savePushToken } from '../services/notificationsService';

// Podešava kako se notifikacije prikazuju dok je app u fokusu (foreground)
// sound: true → zvuk, badge: true → broj na ikoni, alert: true → baner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Hook za upravljanje push notifikacijama
// userId: string | null - ID prijavljenog korisnika (null ako nije ulogovan)
// navigationRef: React ref sa navigation objektom za navigaciju na tap notifikacije
const useNotifications = (userId, navigationRef) => {
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  // Traži dozvolu i registruje uređaj za push notifikacije
  // Vraća Expo Push Token ili null ako dozvola nije dobijena
  const registrujZaPush = useCallback(async () => {
    const { status: postojeciStatus } = await Notifications.getPermissionsAsync();
    let finalniStatus = postojeciStatus;

    // Tražimo dozvolu samo ako još nije dobijena
    if (postojeciStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalniStatus = status;
    }

    if (finalniStatus !== 'granted') {
      console.log('[Notifications] Dozvola za push notifikacije nije dobijena.');
      return null;
    }

    // Specifično za Android: kanal mora biti kreiran
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ResFood',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E7D32',
      });
    }

    // Dohvata Expo Push Token za ovaj uređaj (može da ne uspe na simulatoru)
    try {
      const tokenPodaci = await Notifications.getExpoPushTokenAsync();
      return tokenPodaci.data;
    } catch (err) {
      console.warn('[Notifications] Nije moguće dohvatiti push token (simulator?):', err.message);
      return null;
    }
  }, []);

  // Inicijalizacija: registracija tokena i podešavanje listenera
  useEffect(() => {
    if (!userId) return;

    // Registrujemo uređaj i čuvamo token u bazi
    registrujZaPush().then((token) => {
      if (token && userId) {
        savePushToken(userId, token);
      }
    });

    // Listener za primljene notifikacije dok je app u fokusu (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Primljena notifikacija:', notification.request.content.title);
    });

    // Listener za tap na notifikaciju (foreground i background)
    // data.screen i data.params omogućavaju navigaciju na određeni ekran
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (navigationRef?.current && data?.screen) {
        try {
          navigationRef.current.navigate(data.screen, data.params ?? {});
        } catch (err) {
          console.warn('[Notifications] Navigacija na tap nije uspela:', err.message);
        }
      }
    });

    // Cleanup pri unmount ili promeni userId
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId, registrujZaPush, navigationRef]);

  // Prikazuje lokalnu notifikaciju odmah (bez slanja na server)
  // Koristi se npr. kada kupac uspešno rezerviše ponudu
  // data: { screen, params } - opcioni podaci za navigaciju na tap
  const prikaziLokalnuNotifikaciju = useCallback(async (naslov, poruka, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: naslov,
          body: poruka,
          data,
          sound: true,
        },
        trigger: null, // null = odmah
      });
    } catch (err) {
      console.warn('[Notifications] Greška pri prikazivanju notifikacije:', err.message);
    }
  }, []);

  return { prikaziLokalnuNotifikaciju };
};

export default useNotifications;
