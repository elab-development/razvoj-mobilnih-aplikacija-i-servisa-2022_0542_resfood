# ResFood

Mobilna aplikacija koja povezuje restorane i pekare koji imaju višak hrane na kraju dana sa korisnicima koji tu hranu mogu kupiti po znatno nižim cenama. Cilj je smanjenje bacanja hrane i ušteda za korisnike.

> Studentski projekat — Mobilne aplikacije

---

## Sadržaj

- [O projektu](#o-projektu)
- [Funkcionalnosti](#funkcionalnosti)
- [Tech stack](#tech-stack)
- [Pokretanje projekta](#pokretanje-projekta)
- [Struktura projekta](#struktura-projekta)
- [Baza podataka](#baza-podataka)
- [EAS Build](#eas-build)

---

## O projektu

ResFood funkcioniše po modelu "spasi obrok": restoran uveče postavlja ponude za hranu koja bi inače ostala neprodana (uz 40–80% popusta), a kupci je rezervišu i preuzimaju pre zatvaranja. Aplikacija podržava tri tipa korisnika — kupca, vlasnika restorana i administratora.

---

## Funkcionalnosti

### Kupac
- Pregled aktivnih ponuda sa filterom po kategoriji (Ručak, Pecivo, Desert, Napitak)
- Pretraga restorana na interaktivnoj mapi (GPS prikaz)
- Detaljan prikaz ponude sa izborom količine i rezervacijom
- Pregled profila restorana sa svim aktivnim ponudama
- Upravljanje rezervacijama (pregled statusa, otkazivanje)
- Uređivanje profila (avatar, ime, telefon)
- Prijava putem Face ID / Touch ID

### Vlasnik restorana
- Dashboard sa statistikama (aktivne, rasprodane, istekle ponude)
- Dodavanje i uređivanje ponuda (slika, cena, rok, kategorija, količina)
- Pregled i upravljanje porudžbinama (potvrda preuzimanja, otkazivanje)
- Uređivanje profila restorana (slika, adresa, opis, GPS lokacija)

### Administrator
- Pregled statistika platforme (kupci, restorani, aktivne ponude, rezervacije)
- Lista svih korisnika sa filterom po roli i pretragom
- Lista svih restorana sa filterom po kategoriji i pretragom

### Opšte
- Push notifikacije (lokalne) pri rezervaciji i potvrdi preuzimanja
- Automatsko određivanje GPS lokacije restorana
- Upload slika iz galerije ili kamere

---

## Tech stack

| Tehnologija | Verzija | Namena |
|------------|---------|--------|
| React Native | 0.81.5 | UI framework |
| Expo SDK | 54 | Native API-ji, build |
| Supabase | ^2.108 | Backend, baza, storage |
| React Navigation | ^7 | Navigacija između ekrana |
| expo-notifications | ^0.32 | Push notifikacije |
| expo-location | ~19.0 | GPS geolokacija |
| react-native-maps | ^1.20 | Mapa restorana |
| expo-image-picker | ~17.0 | Kamera i galerija |
| expo-local-authentication | ~17.0 | Face ID / Touch ID |

---

## Pokretanje projekta

### Preduslovi

- [Node.js](https://nodejs.org/) 18+
- [Expo Go](https://expo.dev/client) app na telefonu
- Supabase projekat (vidi dole)

### Instalacija

```bash
git clone https://github.com/elab-development/razvoj-mobilnih-aplikacija-i-servisa-2022_0542_resfood.git
cd razvoj-mobilnih-aplikacija-i-servisa-2022_0542_resfood
npm install --legacy-peer-deps
```

### Supabase podešavanje

1. Kreirati projekat na [supabase.com](https://supabase.com)
2. U Supabase SQL editoru kreirati sledeće tabele:

```sql
-- profiles
create table profiles (
  id uuid references auth.users(id) primary key,
  role text not null default 'buyer',
  ime text,
  telefon text,
  avatar_url text,
  created_at timestamptz default now()
);

-- restaurants
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  naziv text not null,
  adresa text,
  opis text,
  slika_url text,
  latitude float8,
  longitude float8,
  kategorija text default 'restoran',
  created_at timestamptz default now()
);

-- offers
create table offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  naziv text not null,
  opis text,
  originalna_cena numeric,
  snizena_cena numeric,
  kolicina integer default 1,
  preostala_kolicina integer default 1,
  rok timestamptz,
  slika_url text,
  kategorija text default 'ostalo',
  status text default 'aktivna',
  created_at timestamptz default now()
);

-- reservations
create table reservations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references profiles(id),
  offer_id uuid references offers(id),
  kolicina integer default 1,
  status text default 'pending',
  created_at timestamptz default now()
);

-- reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references profiles(id),
  restaurant_id uuid references restaurants(id),
  ocena integer check (ocena between 1 and 5),
  komentar text,
  created_at timestamptz default now()
);

-- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  naslov text,
  poruka text,
  procitana boolean default false,
  created_at timestamptz default now()
);
```

3. U Supabase SQL editoru pokrenuti i trigger koji automatski kreira profil pri registraciji korisnika:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, ime)
  values (new.id, coalesce(new.raw_user_meta_data->>'role', 'buyer'), new.raw_user_meta_data->>'ime');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

4. Kreirati `.env` fajl u korenu projekta (vrednosti se nalaze u Supabase → Project Settings → API):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. U Supabase Storage kreirati dva bucketa:
   - `avatars` — slike profila korisnika i restorana (Public)
   - `offers` — slike ponuda (Public)

6. Uključiti Row Level Security (RLS) na svim tabelama u Supabase → Table Editor → RLS.

7. Opciono — za push notifikacije, dodati kolonu u `profiles` tabelu:
```sql
ALTER TABLE profiles ADD COLUMN push_token TEXT;
```

### Pokretanje

```bash
npx expo start
```

Skenirati QR kod Expo Go aplikacijom.

---

## Struktura projekta

```
ResFood/
├── assets/                      # Ikone i splash screen
├── src/
│   ├── components/
│   │   ├── common/              # Button, Input, LoadingIndicator, ErrorMessage, EmptyState
│   │   └── cards/               # OfferCard
│   ├── screens/
│   │   ├── auth/                # SplashScreen, LoginScreen, RegisterScreen
│   │   ├── buyer/               # HomeScreen, MapScreen, OfferDetailScreen,
│   │   │                        # RestaurantProfileScreen, ReservationsScreen, ProfileScreen
│   │   ├── restaurant/          # DashboardScreen, AddEditOfferScreen,
│   │   │                        # OrdersScreen, RestaurantProfileEditScreen
│   │   └── admin/               # AdminPanelScreen, UsersScreen, RestaurantsScreen
│   ├── navigation/
│   │   ├── AppNavigator.js      # Odlučuje koji navigator na osnovu role
│   │   ├── AuthNavigator.js     # Stack: Login / Register
│   │   ├── BuyerNavigator.js    # Tab: Home / Mapa / Rezervacije / Profil
│   │   ├── RestaurantNavigator.js # Tab: Dashboard / Dodaj / Porudžbine / Profil
│   │   ├── AdminNavigator.js    # Tab: Panel / Korisnici / Restorani
│   │   └── navigationRef.js     # Globalni ref za navigaciju van React stabla
│   ├── services/
│   │   ├── supabase.js          # Supabase klijent
│   │   ├── authService.js       # Login, register, logout, avatar upload
│   │   ├── offersService.js     # CRUD ponude
│   │   ├── restaurantsService.js # CRUD restorani
│   │   ├── reservationsService.js # CRUD rezervacije
│   │   ├── adminService.js      # Admin statistike i liste
│   │   └── notificationsService.js # In-app notifikacije, push token
│   ├── hooks/
│   │   ├── useAuth.js           # Pristup AuthContext-u
│   │   └── useNotifications.js  # Push token, lokalne notifikacije
│   ├── context/
│   │   └── AuthContext.js       # Globalno auth stanje
│   └── constants/
│       └── colors.js            # Paleta boja
├── App.js                       # Entry point
├── app.json                     # Expo konfiguracija
├── eas.json                     # EAS Build konfiguracija
└── package.json
```

---

## Baza podataka

Koristi se Supabase (PostgreSQL). Sve tabele imaju uključen Row Level Security (RLS).

| Tabela | Opis |
|--------|------|
| `profiles` | Korisnici (buyer / restaurant / admin) |
| `restaurants` | Podaci restorana, GPS koordinate |
| `offers` | Ponude hrane sa cenama i rokom trajanja |
| `reservations` | Rezervacije kupaca (pending / completed / cancelled) |
| `reviews` | Recenzije restorana (1–5 zvezdica) |
| `notifications` | In-app notifikacije korisnika |

**Storage bucketi:**
- `avatars` — slike korisnika i restorana
- `offers` — slike ponuda

---

## EAS Build

Za izgradnju APK/AAB fajla koristi se [Expo Application Services](https://expo.dev/eas).

### Instalacija EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Podešavanje projekta

```bash
eas build:configure
```

Uneti EAS Project ID u `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "vas-project-id"
  }
}
```

### Izgradnja

```bash
# Preview APK (za testiranje, interno deljenje)
eas build --platform android --profile preview

# Production AAB (za Google Play)
eas build --platform android --profile production

# iOS (potreban Apple Developer nalog)
eas build --platform ios --profile production
```

### Update bez novog builda (OTA)

```bash
eas update --branch production --message "Opis izmene"
```

---

## Autori

| Ime i prezime | Broj indeksa |
|---------------|-------------|
| Mihailo Radulović | 2022/0542 |
| Petar Ristić | 2022/0552 |

Mentor: Dušan B. Kostić

Fakultet organizacionih nauka, Univerzitet u Beogradu
