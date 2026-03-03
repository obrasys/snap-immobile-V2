// Em Vite (web), variáveis de ambiente devem usar import.meta.env.
// No wrapper nativo (pasta native/), esse valor pode ser consumido no build do app nativo.
export const WEBVIEW_URL = import.meta.env.VITE_WEBVIEW_URL || "https://app.snapimmobile.com.br";

// Para usar variáveis de ambiente reais em React Native, você precisaria instalar
// e configurar uma biblioteca como 'react-native-config' ou 'react-native-dotenv'.
// Ex: yarn add react-native-config
// E então configurar o .env e o build nativo.