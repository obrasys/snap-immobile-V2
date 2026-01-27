import React, { useRef, useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebViewScreen, WebViewScreenRef } from './src/screens/WebViewScreen'; // Importa a interface do ref

/**
 * Componente raiz do aplicativo React Native.
 * Configura o provedor de área segura e lida com o botão de voltar do Android.
 */
const NativeApp = () => {
  // Usamos um ref para acessar os métodos da WebViewScreen
  const webViewScreenRef = useRef<WebViewScreenRef>(null);

  // Lógica para o botão de voltar físico do Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (webViewScreenRef.current && webViewScreenRef.current.canGoBack) {
          webViewScreenRef.current.goBack();
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
      <WebViewScreen ref={webViewScreenRef} />
    </SafeAreaProvider>
  );
};

export default NativeApp;