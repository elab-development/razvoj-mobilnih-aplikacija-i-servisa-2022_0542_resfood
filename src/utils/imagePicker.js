import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Zajednička funkcija za odabir slike iz galerije ili kamere
// aspect: [širina, visina] odnos slike (npr. [1,1] za avatar, [16,9] za baner)
// Vraća URI odabrane slike ili null ako je otkazano/odbijena dozvola
export const odaberiSliku = async ({ kamera, aspect = [1, 1] }) => {
  if (kamera) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Dozvola', 'Potrebna dozvola za pristup kameri.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });
    return result.canceled ? null : result.assets[0].uri;
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Dozvola', 'Potrebna dozvola za pristup galeriji.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });
    return result.canceled ? null : result.assets[0].uri;
  }
};
