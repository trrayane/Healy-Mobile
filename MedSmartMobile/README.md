# 📱 Healy Mobile

Application mobile React Native — miroir exact de la version web **Healy**.

---

## 🏗️ Architecture

```
MedSmartMobile/
├── App.js                          # Point d'entrée principal
├── app.json                        # Configuration Expo
├── package.json
└── src/
    ├── context/
    │   ├── AuthContext.js          # Authentification (AsyncStorage)
    │   ├── ThemeContext.js         # Thème clair/sombre
    │   ├── LanguageContext.js      # i18n (fr/en)
    │   └── DataContext.js          # Données globales (notifs, RDV...)
    ├── services/
    │   └── api.js                  # Tous les appels API (miroir de la version web)
    ├── theme/
    │   └── index.js                # Tokens : T, ADMIN_T, HMS, GRADIENTS...
    ├── locales/
    │   ├── fr.js                   # Traductions françaises
    │   └── en.js                   # Traductions anglaises
    ├── components/
    │   └── shared/
    │       └── index.js            # Card, Badge, Button, Avatar, Input...
    ├── navigation/
    │   └── AppNavigator.js         # Navigation par rôle + BottomTabNavigator
    └── screens/
        ├── auth/
        │   ├── LoginScreen.js
        │   ├── RegisterScreen.js
        │   └── ForgotPasswordScreen.js
        ├── patient/
        │   ├── PatientDashboard.js
        │   └── FindDoctorsScreen.js
        ├── doctor/
        │   └── DoctorDashboard.js
        ├── pharmacist/
        │   └── PharmacistDashboard.js
        ├── caretaker/
        │   └── CaretakerDashboard.js
        ├── admin/
        │   └── AdminDashboard.js
        └── shared/
            ├── ChatScreen.js
            ├── NotificationsScreen.js
            └── ProfileScreen.js
```

---

## 🚀 Installation & Lancement

### Prérequis
- Node.js 18+
- Expo CLI : `npm install -g expo-cli`
- Application **Expo Go** sur votre téléphone

### Installation
```bash
cd MedSmartMobile
npm install

# Installer la police Plus Jakarta Sans
npx expo install @expo-google-fonts/plus-jakarta-sans
```

### Lancer l'application
```bash
npx expo start
```

Scannez le QR code avec **Expo Go** (Android) ou l'appareil photo (iOS).

---

## ⚙️ Configuration API

Modifiez l'URL du backend dans `src/services/api.js` :

```js
const BASE_URL = 'http://YOUR_IP:8000/api';
```

> ⚠️ Sur téléphone physique, remplacez `127.0.0.1` par l'adresse IP locale de votre machine.

---

## 🎨 Thème & Design

Identique à la version web :
- **Palette claire / sombre** : `T.light` / `T.dark`
- **Palette Admin HMS** : `HMS` (dark) / `HMS_LIGHT` (light)
- **Couleurs par rôle** : bleu (patient), vert (médecin), ambre (pharmacien), violet (garde-malade), rouge (admin)
- **Typographie** : Plus Jakarta Sans (Regular, Medium, SemiBold, Bold, ExtraBold)
- **Gradients** : primary, green, amber, red, purple, darkBg

---

## 📲 Fonctionnalités par rôle

| Rôle | Écrans | Fonctionnalités |
|------|--------|-----------------|
| **Patient** | Dashboard, Médecins, Chat, Notifs, Profil | RDV, ordonnances, traitements, analyse IA |
| **Médecin** | Dashboard, Patients, Planning, Ordonnances, Avis | Consultations, prescriptions, agenda |
| **Pharmacien** | Dashboard, Commandes, Médicaments, Stock | Gestion commandes & inventaire |
| **Garde-malade** | Dashboard, Patients, Tâches, Ordonnances | Suivi patients, gestion tâches |
| **Admin** | Dashboard, Utilisateurs, En attente, Planning, Logs | Validation comptes, audit, statistiques |

---

## 🔐 Authentification

- JWT stocké dans `expo-secure-store` via `AsyncStorage`
- Refresh token automatique
- Navigation par rôle automatique après login
- Support OTP pour inscription & reset mot de passe

---

## 📦 Dépendances clés

| Package | Usage |
|---------|-------|
| `expo` | Framework principal |
| `react-navigation` | Navigation + BottomTabs |
| `expo-linear-gradient` | Gradients (identiques au web) |
| `@react-native-async-storage/async-storage` | Stockage local |
| `lucide-react-native` | Icônes (identiques au web) |
| `date-fns` | Formatage des dates |

---

## 🧪 Test rapide

Pour tester sans backend, modifiez temporairement `AuthContext.js` :
```js
// Simuler un login patient
loginWithData('patient', { first_name: 'Ahmed', last_name: 'Bensalem', email: 'test@test.com' });
```

---

*Med Smart Mobile — Plateforme de santé connectée · Algérie · v1.0.0*
