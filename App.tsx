import React, { useRef, useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebViewScreen } from './src/screens/WebViewScreen';
import { WebView } from 'react-native-webview'; // Importar WebView para tipagem do ref

/**
 * Componente raiz do aplicativo React Native.
 * Configura o provedor de área segura e lida com o botão de voltar do Android.
 */
const App = () => {
  // Usamos um ref para acessar os métodos da WebView de WebViewScreen
  const webViewRef = useRef<WebView>(null);

  // Expor o ref da WebView para que App.tsx possa acessá-lo
  // Isso é um hack, idealmente WebViewScreen deveria gerenciar seu próprio back button
  // mas para o requisito de fechar o app, precisamos de acesso aqui.
  // Em um cenário real, usaríamos um Context API ou Redux para gerenciar o estado de canGoBack
  // e a função goBack da WebView.
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        // @ts-ignore - webViewRef.current pode ser nulo ou não ter goBack
        if (webViewRef.current && webViewRef.current.canGoBack) {
          // @ts-ignore
          webViewRef.current.goBack();
          return true; // Indica que o evento foi tratado
        }
        BackHandler.exitApp(); // Fecha o app se não houver para onde voltar na WebView
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }
    return undefined;
  }, []);

  return (
    <SafeAreaProvider>
      {/* Passa o ref para WebViewScreen para que ele possa ser usado para o botão de voltar do Android */}
      <WebViewScreen ref={webViewRef} />
    </SafeAreaProvider>
  );
};

export default App;