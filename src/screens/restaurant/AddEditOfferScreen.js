import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { odaberiSliku } from '../../utils/imagePicker';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import { getMyRestaurant } from '../../services/restaurantsService';
import { createOffer, updateOffer, uploadOfferImage } from '../../services/offersService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

// Kategorije ponude sa labelama
const KATEGORIJE = [
  { id: 'rucak', label: 'Ručak' },
  { id: 'pecivo', label: 'Pecivo' },
  { id: 'desert', label: 'Desert' },
  { id: 'napitak', label: 'Napitak' },
  { id: 'ostalo', label: 'Ostalo' },
];

// Formatira Date na "DD.MM.YYYY"
const toDatumStr = (d) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

// Formatira Date na "HH:MM"
const toVremeStr = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Parsira "DD.MM.YYYY" i "HH:MM" → Date ili null ako nije ispravno
const parseRok = (datumStr, vremeStr) => {
  const delDatum = datumStr.trim().split('.');
  const delVreme = vremeStr.trim().split(':');
  if (delDatum.length !== 3 || delVreme.length !== 2) return null;
  const [dan, mesec, godina] = delDatum.map(Number);
  const [sati, minuti] = delVreme.map(Number);
  if ([dan, mesec, godina, sati, minuti].some(isNaN)) return null;
  return new Date(godina, mesec - 1, dan, sati, minuti);
};

// ─────────────────────────────────────────────
const AddEditOfferScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();

  // Forma stanja
  const [naziv, setNaziv] = useState('');
  const [opis, setOpis] = useState('');
  const [kategorija, setKategorija] = useState('');
  const [originalCena, setOriginalCena] = useState('');
  const [snizenaCena, setSnizenaCena] = useState('');
  const [kolicina, setKolicina] = useState('');
  const [datum, setDatum] = useState('');
  const [vreme, setVreme] = useState('');
  const [slikaUri, setSlikaUri] = useState(null);      // nova lokalna slika
  const [postojecaSlikaUrl, setPostojecaSlikaUrl] = useState(null); // URL u Supabase

  // Meta stanja
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [restoran, setRestoran] = useState(null);
  const [greske, setGreske] = useState({});
  const [cuvam, setCuvam] = useState(false);

  // Ref koji pamti ID poslednje učitane ponude da bismo znali
  // kada se zaista menjamo kontekst (nova ponuda vs edit vs povratak na tab)
  const poslednjiEditId = useRef(undefined);

  // Resetuje formu na prazne vrednosti sa default rokom (sutra 18:00)
  const resetujFormu = useCallback(() => {
    const sutra = new Date();
    sutra.setDate(sutra.getDate() + 1);
    setNaziv('');
    setOpis('');
    setKategorija('');
    setOriginalCena('');
    setSnizenaCena('');
    setKolicina('');
    setDatum(toDatumStr(sutra));
    setVreme('18:00');
    setSlikaUri(null);
    setPostojecaSlikaUrl(null);
    setGreske({});
    setEditMode(false);
    setEditId(null);
  }, []);

  // Popunjava formu vrednostima postojeće ponude (edit mode)
  const popuniFormu = useCallback((ponuda) => {
    const rokDate = new Date(ponuda.rok);
    setNaziv(ponuda.naziv);
    setOpis(ponuda.opis ?? '');
    setKategorija(ponuda.kategorija);
    setOriginalCena(String(ponuda.originalna_cena));
    setSnizenaCena(String(ponuda.snizena_cena));
    setKolicina(String(ponuda.kolicina));
    setDatum(toDatumStr(rokDate));
    setVreme(toVremeStr(rokDate));
    setSlikaUri(null);
    setPostojecaSlikaUrl(ponuda.slika_url ?? null);
    setGreske({});
    setEditMode(true);
    setEditId(ponuda.id);
  }, []);

  // Čita params pri fokusu - forma se reinicijalizuje samo kada se menja kontekst
  // (nova ponuda vs edit), ne i kada se korisnik samo vrati na tab
  useFocusEffect(
    useCallback(() => {
      const ponuda = route.params?.ponuda ?? null;
      const noviEditId = ponuda?.id ?? null;

      // Reinicijalizuj formu samo ako se promenio kontekst (id ponude)
      if (noviEditId !== poslednjiEditId.current) {
        poslednjiEditId.current = noviEditId;
        if (ponuda) {
          popuniFormu(ponuda);
        } else {
          resetujFormu();
        }
      }

      // Dohvata restoran jednom (ako već nije učitan)
      if (!restoran && user?.id) {
        getMyRestaurant(user.id).then(setRestoran).catch(console.error);
      }
    }, [route.params?.ponuda, user?.id])
  );

  // Otvara ActionSheet za odabir izvora slike (galerija ili kamera)
  const onOdaberiSliku = (kamera) => async () => {
    const uri = await odaberiSliku({ kamera, aspect: [16, 9] });
    if (uri) setSlikaUri(uri);
  };

  const prikaziPickerMeni = () => {
    Alert.alert('Dodaj sliku', 'Odaberi izvor slike', [
      { text: 'Galerija', onPress: onOdaberiSliku(false) },
      { text: 'Kamera', onPress: onOdaberiSliku(true) },
      ...(slikaUri || postojecaSlikaUrl
        ? [{ text: 'Ukloni sliku', style: 'destructive', onPress: () => { setSlikaUri(null); setPostojecaSlikaUrl(null); } }]
        : []),
      { text: 'Otkaži', style: 'cancel' },
    ]);
  };

  // Validira formu i vraća objekat sa greškama
  const validiraj = () => {
    const errs = {};
    if (!naziv.trim()) errs.naziv = 'Naziv je obavezan';

    const orig = parseFloat(originalCena);
    const sniz = parseFloat(snizenaCena);
    if (!originalCena || isNaN(orig) || orig <= 0)
      errs.originalCena = 'Unesite ispravnu cenu';
    if (!snizenaCena || isNaN(sniz) || sniz <= 0)
      errs.snizenaCena = 'Unesite ispravnu cenu';
    if (!isNaN(orig) && !isNaN(sniz) && sniz >= orig)
      errs.snizenaCena = 'Mora biti manja od originalne cene';

    const kol = parseInt(kolicina);
    if (!kolicina || isNaN(kol) || kol <= 0)
      errs.kolicina = 'Unesite ispravnu količinu';

    const rokDate = parseRok(datum, vreme);
    if (!rokDate || isNaN(rokDate.getTime()))
      errs.datum = 'Unesite ispravan datum (DD.MM.YYYY)';
    else if (rokDate <= new Date())
      errs.datum = 'Rok mora biti u budućnosti';

    if (!kategorija) errs.kategorija = 'Odaberite kategoriju';

    return errs;
  };

  // Sačuvava ponudu (kreira novu ili ažurira postojeću)
  const onSacuvaj = async () => {
    const errs = validiraj();
    if (Object.keys(errs).length > 0) {
      setGreske(errs);
      return;
    }
    if (!restoran) {
      Alert.alert('Greška', 'Nema podataka o restoranu. Idite na Profil tab.');
      return;
    }

    setCuvam(true);
    try {
      // Uploadujemo novu sliku ako je odabrana
      let slikaUrl = postojecaSlikaUrl;
      if (slikaUri) {
        slikaUrl = await uploadOfferImage(slikaUri, restoran.id);
      }

      const rok = parseRok(datum, vreme);
      const podaci = {
        restaurant_id: restoran.id,
        naziv: naziv.trim(),
        opis: opis.trim() || null,
        kategorija,
        originalna_cena: parseFloat(originalCena),
        snizena_cena: parseFloat(snizenaCena),
        kolicina: parseInt(kolicina),
        preostala_kolicina: editMode ? undefined : parseInt(kolicina),
        rok: rok.toISOString(),
        slika_url: slikaUrl,
        status: 'aktivna',
      };

      // Uklanjamo undefined vrednosti (preostala_kolicina u edit mode)
      if (podaci.preostala_kolicina === undefined) delete podaci.preostala_kolicina;

      if (editMode) {
        await updateOffer(editId, podaci);
      } else {
        await createOffer(podaci);
      }

      // Čistimo params i vraćamo se na Dashboard
      navigation.setParams({ ponuda: undefined });
      navigation.navigate('Dashboard');
      Alert.alert(
        'Uspešno!',
        editMode ? 'Ponuda je ažurirana.' : 'Nova ponuda je kreirana.',
      );
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće sačuvati ponudu. Pokušaj ponovo.');
    } finally {
      setCuvam(false);
    }
  };

  const prikazanaSlika = slikaUri ?? postojecaSlikaUrl;

  return (
    <SafeAreaView style={styles.kontejner}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Naslov ekrana */}
          <View style={styles.header}>
            <Text style={styles.naslov}>
              {editMode ? 'Uredi ponudu' : 'Nova ponuda'}
            </Text>
            {editMode && (
              <TouchableOpacity
                onPress={() => { resetujFormu(); navigation.navigate('Dashboard'); }}
                accessibilityLabel="Odustani od uređivanja"
              >
                <Text style={styles.odustaniTekst}>Odustani</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Slika ── */}
          <TouchableOpacity
            style={styles.slikaKontejner}
            onPress={prikaziPickerMeni}
            activeOpacity={0.85}
            accessibilityLabel="Dodaj ili promeni sliku ponude"
            accessibilityRole="button"
          >
            {prikazanaSlika ? (
              <>
                <Image source={{ uri: prikazanaSlika }} style={styles.slika} resizeMode="cover" />
                <View style={styles.promeniBedz}>
                  <Ionicons name="camera" size={16} color={colors.white} />
                  <Text style={styles.promeniTekst}>Promeni sliku</Text>
                </View>
              </>
            ) : (
              <View style={styles.slikaPlaceholder}>
                <Ionicons name="camera-outline" size={40} color={colors.gray} />
                <Text style={styles.slikaPlaceholderTekst}>Dodaj sliku ponude</Text>
                <Text style={styles.slikaPlaceholderPodnaslov}>Tap za galeriju ili kameru</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Osnovne informacije ── */}
          <Text style={styles.sekcija}>Osnovne informacije</Text>

          <Input
            label="Naziv ponude"
            value={naziv}
            onChangeText={(v) => { setNaziv(v); setGreske((g) => ({ ...g, naziv: undefined })); }}
            placeholder="npr. Mešano meso sa prilogom…"
            error={greske.naziv}
            autoCapitalize="sentences"
          />

          <Input
            label="Opis (opciono)"
            value={opis}
            onChangeText={setOpis}
            placeholder="Kratki opis ponude…"
            multiline
            numberOfLines={3}
            style={{ marginBottom: 0 }}
          />
          <View style={{ height: 16 }} />

          {/* ── Kategorija ── */}
          <Text style={styles.sekcija}>Kategorija</Text>
          <View style={styles.pilovi}>
            {KATEGORIJE.map((k) => (
              <TouchableOpacity
                key={k.id}
                style={[styles.pill, kategorija === k.id && styles.pillAktivna]}
                onPress={() => { setKategorija(k.id); setGreske((g) => ({ ...g, kategorija: undefined })); }}
                accessibilityLabel={`Kategorija: ${k.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: kategorija === k.id }}
              >
                <Text style={[styles.pillTekst, kategorija === k.id && styles.pillTekstAktivan]}>
                  {k.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {greske.kategorija && (
            <Text style={styles.greskaTekst}>{greske.kategorija}</Text>
          )}
          <View style={{ height: 16 }} />

          {/* ── Cene ── */}
          <Text style={styles.sekcija}>Cene (RSD)</Text>
          <View style={styles.red}>
            <Input
              label="Originalna cena"
              value={originalCena}
              onChangeText={(v) => { setOriginalCena(v); setGreske((g) => ({ ...g, originalCena: undefined })); }}
              placeholder="500"
              keyboardType="decimal-pad"
              error={greske.originalCena}
              style={styles.pola}
            />
            <Input
              label="Snižena cena"
              value={snizenaCena}
              onChangeText={(v) => { setSnizenaCena(v); setGreske((g) => ({ ...g, snizenaCena: undefined })); }}
              placeholder="200"
              keyboardType="decimal-pad"
              error={greske.snizenaCena}
              style={styles.pola}
            />
          </View>

          {/* Prikaz popusta ako su obe cene unesene */}
          {parseFloat(originalCena) > 0 && parseFloat(snizenaCena) > 0 &&
            parseFloat(snizenaCena) < parseFloat(originalCena) && (
            <View style={styles.popustInfo}>
              <Ionicons name="trending-down" size={16} color={colors.success} />
              <Text style={styles.popustInfoTekst}>
                Popust: {Math.round((1 - parseFloat(snizenaCena) / parseFloat(originalCena)) * 100)}%
                · Kupci štede {(parseFloat(originalCena) - parseFloat(snizenaCena)).toFixed(0)} RSD
              </Text>
            </View>
          )}

          {/* ── Dostupnost ── */}
          <Text style={styles.sekcija}>Dostupnost</Text>
          <Input
            label="Ukupna količina (kom)"
            value={kolicina}
            onChangeText={(v) => { setKolicina(v); setGreske((g) => ({ ...g, kolicina: undefined })); }}
            placeholder="10"
            keyboardType="number-pad"
            error={greske.kolicina}
          />

          <View style={styles.red}>
            <Input
              label="Datum isteka"
              value={datum}
              onChangeText={(v) => { setDatum(v); setGreske((g) => ({ ...g, datum: undefined })); }}
              placeholder="15.06.2026"
              keyboardType="numbers-and-punctuation"
              error={greske.datum}
              style={styles.pola}
            />
            <Input
              label="Vreme isteka"
              value={vreme}
              onChangeText={setVreme}
              placeholder="18:00"
              keyboardType="numbers-and-punctuation"
              style={styles.pola}
            />
          </View>

          {/* ── Submit dugme ── */}
          <Button
            title={editMode ? 'Sačuvaj izmene' : 'Objavi ponudu'}
            onPress={onSacuvaj}
            loading={cuvam}
            style={styles.sacuvajDugme}
          />

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  kontejner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  naslov: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  odustaniTekst: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Slika
  slikaKontejner: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    height: 180,
    backgroundColor: colors.grayLight,
  },
  slika: {
    width: '100%',
    height: '100%',
  },
  promeniBedz: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  promeniTekst: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  slikaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  slikaPlaceholderTekst: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.grayDark,
  },
  slikaPlaceholderPodnaslov: {
    fontSize: 13,
    color: colors.gray,
  },
  // Sekcija naslov
  sekcija: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  // Kategorija pills
  pilovi: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillAktivna: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillTekst: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  pillTekstAktivan: {
    color: colors.white,
    fontWeight: '600',
  },
  greskaTekst: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  // Red sa dva inputa
  red: {
    flexDirection: 'row',
    gap: 12,
  },
  pola: {
    flex: 1,
  },
  // Popust info
  popustInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success + '15',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    marginTop: -8,
  },
  popustInfoTekst: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
    flex: 1,
  },
  sacuvajDugme: {
    marginTop: 8,
  },
});

export default AddEditOfferScreen;
