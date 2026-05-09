# AniTrackRN

Pentru Web, ruleaza din folderul proiectului:

npm run start
Apoi deschizi:

http://127.0.0.1:5173
sau URL-ul afisat in terminal de Vite.

Pentru Expo app: momentan nu va merge in Expo Go, pentru ca proiectul a fost facut acum ca React Web app cu Vite, react-router-dom, CSS files si localStorage. Expo/React Native nu suporta direct CSS imports, DOM window.localStorage, BrowserRouter, img, div, etc.

Mobile Expo este in mobile/App.tsx.

Mobile foloseste AniList API.

Are Home, Details, My List, Settings.

Are cache/offline cu AsyncStorage.

Salveaza lista anime, rating, status si settings local.

Are dark/light mode pe mobile.


Comenzi:

Pentru Web:

bash

npm run start


Pentru Expo / telefon:

bash

npm run mobile


Apoi scanezi QR code-ul cu Expo Go.

Pentru emulator Android / Android Studio:

bash

npm run mobile:android


Sau direct:

bash

cd mobile
npm run start
npm run android
