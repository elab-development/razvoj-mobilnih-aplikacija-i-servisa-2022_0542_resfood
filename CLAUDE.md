# ResFood - CLAUDE.md

## O projektu

ResFood je mobilna aplikacija koja povezuje restorane i pekare koji imaju višak nepotrebnih obroka na kraju dana sa korisnicima koji te obroke mogu kupiti po drastično nižim cenama. Cilj je smanjiti bacanje hrane i uštedeti novac korisnicima.

**Ovo je studentski projekat** - kod treba biti pisan što jasnije i razumljivije, bez nepotrebne kompleksnosti. Uvek birati najjednostavnije rešenje koje ispunjava zahtev.

---

## Tech Stack

- **React Native** sa **Expo SDK 54**
- **Expo Go** za razvoj i testiranje
- **React Navigation** (ne expo-router) za navigaciju
- **Supabase** za backend, bazu podataka i storage
- **AsyncStorage** za čuvanje sesije

---

## Tipovi korisnika i Auth flow

Aplikacija ima 3 tipa korisnika određena poljem `role` u tabeli `profiles`:

- `buyer` - kupac koji pretražuje i rezerviše ponude
- `restaurant` - vlasnik restorana/pekare koji postavlja ponude
- `admin` - administrator koji upravlja platformom

**Auth flow:**
```
App start
  → provjeri Supabase sesiju
    → nema sesije → AuthNavigator (Login/Register)
    → ima sesije → provjeri role iz profiles tabele
        → buyer    → BuyerNavigator
        → restaurant → RestaurantNavigator
        → admin    → AdminNavigator
```

Auth stanje se čuva globalno putem **Context API** (`src/context/AuthContext.js`).

---

## Ekrani

### Auth ekrani (bez navbara)
| Ekran | Fajl | Opis |
|-------|------|------|
| Splash | `screens/auth/SplashScreen.js` | Logo i animacija pri pokretanju |
| Login | `screens/auth/LoginScreen.js` | Prijava korisnika |
| Register | `screens/auth/RegisterScreen.js` | Registracija, izbor tipa naloga |

### Buyer ekrani
| Ekran | Fajl | Navbar |
|-------|------|--------|
| Home | `screens/buyer/HomeScreen.js` | Da |
| Mapa | `screens/buyer/MapScreen.js` | Da |
| Rezervacije | `screens/buyer/ReservationsScreen.js` | Da |
| Profil | `screens/buyer/ProfileScreen.js` | Da |
| Detalj ponude | `screens/buyer/OfferDetailScreen.js` | Ne (otvara se iz Home ili Mape) |
| Profil restorana | `screens/buyer/RestaurantProfileScreen.js` | Ne (otvara se iz Detalja ponude ili Mape) |

### Restaurant ekrani
| Ekran | Fajl | Navbar |
|-------|------|--------|
| Dashboard | `screens/restaurant/DashboardScreen.js` | Da |
| Dodaj/Uredi ponudu | `screens/restaurant/AddEditOfferScreen.js` | Da |
| Porudžbine | `screens/restaurant/OrdersScreen.js` | Da |
| Profil restorana | `screens/restaurant/RestaurantProfileEditScreen.js` | Da |

### Admin ekrani
| Ekran | Fajl | Navbar |
|-------|------|--------|
| Admin Panel | `screens/admin/AdminPanelScreen.js` | Da |
| Korisnici | `screens/admin/UsersScreen.js` | Da |
| Restorani | `screens/admin/RestaurantsScreen.js` | Da |

---

## Navbar struktura

### Buyer (4 taba)
- 🏠 Home → `HomeScreen`
- 🗺️ Mapa → `MapScreen`
- 📋 Rezervacije → `ReservationsScreen`
- 👤 Profil → `ProfileScreen`

### Restaurant (4 taba)
- 📊 Dashboard → `DashboardScreen`
- ➕ Dodaj ponudu → `AddEditOfferScreen`
- 🛒 Porudžbine → `OrdersScreen`
- 👤 Profil → `RestaurantProfileEditScreen`

### Admin (3 taba)
- 🏠 Panel → `AdminPanelScreen`
- 👥 Korisnici → `UsersScreen`
- 🏪 Restorani → `RestaurantsScreen`

---

## Struktura foldera

```
ResFood/
├── assets/                        # Slike, ikonice, fontovi
├── src/
│   ├── components/
│   │   ├── common/                # Komponente koje se koriste svuda
│   │   │   ├── Button.js          # Univerzalno dugme
│   │   │   ├── Input.js           # Univerzalni input
│   │   │   ├── LoadingIndicator.js
│   │   │   ├── ErrorMessage.js
│   │   │   └── EmptyState.js
│   │   └── cards/                 # Kartice za prikaz podataka
│   │       ├── OfferCard.js       # Kartica ponude (koristi se na Home i Dashboard)
│   │       └── ReviewCard.js      # Kartica recenzije
│   ├── screens/
│   │   ├── auth/
│   │   ├── buyer/
│   │   ├── restaurant/
│   │   └── admin/
│   ├── navigation/
│   │   ├── AppNavigator.js        # Glavni navigator, odlučuje koji stack da prikaže
│   │   ├── AuthNavigator.js       # Stack za Login/Register/Splash
│   │   ├── BuyerNavigator.js      # Tab navigator za kupca
│   │   ├── RestaurantNavigator.js # Tab navigator za restoran
│   │   ├── AdminNavigator.js      # Tab navigator za admina
│   │   └── navigationRef.js       # Ref za navigaciju van React stabla (notifikacije)
│   ├── context/
│   │   ├── AuthContext.js         # Globalno auth stanje (korisnik, rola, sesija)
│   │   └── ThemeContext.js        # Light/dark tema, distribuira boje kroz app
│   ├── services/
│   │   ├── supabase.js            # Supabase klijent (konekcija)
│   │   ├── authService.js         # Login, register, logout funkcije
│   │   ├── offersService.js       # CRUD za ponude
│   │   ├── restaurantsService.js  # CRUD za restorane
│   │   ├── reservationsService.js # CRUD za rezervacije
│   │   ├── reviewsService.js      # CRUD za recenzije
│   │   └── notificationsService.js
│   ├── hooks/
│   │   ├── useAuth.js             # Hook za pristup auth kontekstu
│   │   ├── useTheme.js            # Hook za pristup theme kontekstu
│   │   └── useNotifications.js    # Hook za push notifikacije
│   ├── utils/
│   │   ├── formatDate.js          # Formatiranje datuma i rokova
│   │   └── imagePicker.js         # Helper za odabir slike (kamera ili galerija)
│   └── constants/
│       └── colors.js              # Paleta boja
├── .env                           # Supabase kredencijali (NE commitovati!)
├── .gitignore
├── app.json
├── eas.json
└── App.js                         # Entry point
```

### Pravilo za komponente
- **Sve što se pojavljuje na više od jednog ekrana mora biti komponenta**
- `components/common/` - generičke UI komponente (dugmad, inputi, loading...)
- `components/cards/` - kartice za prikaz entiteta
- **Bez duplog koda** - ako se isti JSX ponavlja dva puta, to je komponenta
- **Ne preterivati** - ako se nešto koristi samo jednom i nije kompleksno, ne treba komponenta

---

## Frontend

### Dizajn sistem
- **Primarna boja:** `#2E7D32` (tamno zelena)
- **Akcent boja:** `#FF6F00` (narandžasta)
- **Pozadina:** `#F5F5F5`
- **Stil:** Rounded kartice (borderRadius: 12), čisto i minimalistično
- **Font:** Sistemski font (ne uvozimo poseban)
- Sve boje definisane u `src/constants/colors.js` - nigde hardcodovane boje u komponentama

### Komentari u kodu
Komentari se pišu **na srpskom jeziku** i obavezno se dodaju u sledećim slučajevima:
- Kada se podaci prenose između ekrana (navigation params)
- Kada se podaci prenose između komponenti (props)
- Kompleksnije funkcije koje nisu odmah jasne
- Svaki poziv ka Supabase bazi ili storage-u

### Error handling i loading stanje
Svaki ekran koji učitava podatke mora imati:
- `loading` state → prikazuje `<LoadingIndicator />`
- `error` state → prikazuje `<ErrorMessage />`
- Prazno stanje → prikazuje `<EmptyState />`

---

## Backend i Baza podataka

### Supabase projekat
- **Naziv:** ResFood
- **URL i ključevi:** hardkodovani direktno u `src/services/supabase.js` (anon key je javni ključ, bezbedan za klijentski kod)

### Tabele

#### `profiles`
| Kolona | Tip | Opis |
|--------|-----|------|
| id | uuid | FK → auth.users(id) |
| role | text | 'buyer' / 'restaurant' / 'admin' |
| ime | text | Ime korisnika |
| telefon | text | Broj telefona |
| avatar_url | text | URL slike u Supabase Storage |
| push_token | text | Expo Push Token za notifikacije |
| created_at | timestamp | Vreme kreiranja |

#### `restaurants`
| Kolona | Tip | Opis |
|--------|-----|------|
| id | uuid | PK |
| owner_id | uuid | FK → profiles(id) |
| naziv | text | Naziv restorana |
| adresa | text | Adresa |
| opis | text | Opis |
| slika_url | text | URL slike u Supabase Storage |
| latitude | float | GPS koordinata |
| longitude | float | GPS koordinata |
| kategorija | text | 'restoran' / 'pekara' / 'kafic' / 'ostalo' |
| created_at | timestamp | |

#### `offers`
| Kolona | Tip | Opis |
|--------|-----|------|
| id | uuid | PK |
| restaurant_id | uuid | FK → restaurants(id) |
| naziv | text | Naziv ponude |
| opis | text | Opis |
| originalna_cena | numeric | Originalna cena |
| snizena_cena | numeric | Snižena cena |
| kolicina | integer | Ukupna količina |
| preostala_kolicina | integer | Preostala količina |
| rok | timestamp | Vreme do kada važi |
| slika_url | text | URL slike u Supabase Storage |
| kategorija | text | 'rucak' / 'pecivo' / 'desert' / 'napitak' / 'ostalo' |
| status | text | 'aktivna' / 'istekla' / 'rasprodana' |
| created_at | timestamp | |

#### `reservations`
| Kolona | Tip | Opis |
|--------|-----|------|
| id | uuid | PK |
| buyer_id | uuid | FK → profiles(id) |
| offer_id | uuid | FK → offers(id) |
| kolicina | integer | Rezervisana količina |
| status | text | 'pending' / 'completed' / 'cancelled' |
| created_at | timestamp | |

#### `reviews`
| Kolona | Tip | Opis |
|--------|-----|------|
| id | uuid | PK |
| buyer_id | uuid | FK → profiles(id) |
| restaurant_id | uuid | FK → restaurants(id) |
| ocena | integer | 1-5 |
| komentar | text | Tekst recenzije |
| created_at | timestamp | |

#### `notifications`
| Kolona | Tip | Opis |
|--------|-----|------|
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| naslov | text | Naslov notifikacije |
| poruka | text | Tekst notifikacije |
| procitana | boolean | Da li je pročitana |
| created_at | timestamp | |

### Supabase Storage bucketi
- `avatars` - slike profila korisnika (`{userId}.jpg`) i slike restorana (`restaurants/{restaurantId}.jpg`) (public)
- `offers` - slike ponuda (`{restaurantId}/{timestamp}.jpg`) (public)

### Row Level Security (RLS)
RLS je uključen na svim tabelama. Detaljne politike su definisane u inicijalnom SQL skriptu. Svaki servisni fajl u `src/services/` komunicira isključivo kroz Supabase klijent koji automatski primenjuje RLS.

### Service fajlovi (backend komunikacija)
Sva komunikacija sa Supabase-om ide **isključivo kroz `src/services/`** fajlove. Ekrani i komponente nikada direktno ne pozivaju `supabase` klijent - uvek koriste servisne funkcije.

---

## Native funkcionalnosti

| Funkcionalnost | Paket | Koristi se na |
|---------------|-------|---------------|
| Geolokacija | `expo-location` | `MapScreen` (GPS pozicija korisnika) |
| Mape | `react-native-maps` | `MapScreen`, `RestaurantProfileScreen` |
| Kamera i galerija | `expo-camera`, `expo-image-picker` | `AddEditOfferScreen`, `ProfileScreen` |
| Biometrijska autentifikacija | `expo-local-authentication` | `LoginScreen` (brza prijava) |
| Push notifikacije | `expo-notifications` | `useNotifications` hook, pozadinska obrada |

---

## Skills - obavezno koristiti

### Pri svakoj implementaciji UI komponente ili ekrana:
- `frontend-design` - za kvalitet i strukturu koda
- `ui-ux-pro-max` - za dizajn odluke, layout, boje, spacing
- `web-design-guidelines` - za review UI-a

### Periodično tokom razvoja:
- `webapp-testing` - koristiti nakon što se završi svaki veći deo (npr. ceo auth flow, ceo buyer flow...)

### Samo pri greškama i bugovima:
- `systematic-debugging` - koristiti kada bug nije odmah jasan

### Jednom na početku (već urađeno):
- `supabase-postgres-best-practices` - provera da li je baza dobro podešena

---

## .env fajl

```
EXPO_PUBLIC_SUPABASE_URL=https://ehycpvealyunjqpwaplz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tvoj_anon_key
```

## .gitignore - obavezno uključiti

```
node_modules/
.env
.expo/
dist/
```

---

## Git workflow

Projekat ima dva kontributora. Commitovi se dele između dva GitHub naloga kako bi izgledalo da su oba učesnika radila na projektu. Koristiti smislene commit poruke koje opisuju šta je urađeno.
