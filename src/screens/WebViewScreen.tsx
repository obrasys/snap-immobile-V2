import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Loading } from '../components/Loading';
import { WEBVIEW_URL } from '../services/env'; // Importa a URL da variável de ambiente

// Domínios permitidos para navegação interna na WebView
const ALLOWED_WEBVIEW_HOSTS = [
  'app.snapimmobile.com.br', // Domínio principal
  // Adicione outros subdomínios de snapimmobile.app se necessário
];

/**
 * Interface para os métodos expostos pelo ref da WebViewScreen.
 */
export interface WebViewScreenRef {
  goBack: () => void;
  canGoBack: boolean;
  reload: () => void;
}

/**
 * Tela principal que renderiza a aplicação web dentro de uma WebView.
 * Inclui tratamento de carregamento, erros, navegação e permissões.
 */
export const WebViewScreen = forwardRef<WebViewScreenRef>((props, ref) => {
  const internalWebViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState(true);
  const [error, setError] = useState(false);
  const [internalCanGoBack, setInternalCanGoBack] = useState(false);

  // Expõe métodos e propriedades para o ref externo
  useImperativeHandle(ref, () => ({
    goBack: () => {
      internalWebViewRef.current?.goBack();
    },
    get canGoBack() {
      return internalCanGoBack;
    },
    reload: () => {
      internalWebViewRef.current?.reload();
    },
  }));

  // Monitora o status da conexão de rede
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus(state.isConnected ?? false);
      if (state.isConnected && error) {
        // Se a conexão for restaurada e houver um erro, tenta recarregar
        setError(false);
        internalWebViewRef.current?.reload();
      }
    });
    return () => unsubscribe();
  }, [error]);

  // Lida com o início do carregamento da WebView
  const onLoadStart = useCallback(() => {
    setLoading(true);
    setError(false); // Limpa o estado de erro ao iniciar um novo carregamento
  }, []);

  // Lida com o fim do carregamento da WebView
  const onLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  // Lida com erros de carregamento da WebView
  const onError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView Error:', nativeEvent);
    setError(true);
    setLoading(false);
  }, []);

  // Lida com erros HTTP da WebView
  const onHttpError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView HTTP Error:', nativeEvent);
    setError(true);
    setLoading(false);
  }, []);

  // Lida com a mudança de estado da navegação (para o botão de voltar do Android)
  const onNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setInternalCanGoBack(navState.canGoBack);
  }, []);

  // Lida com a decisão de carregar uma URL na WebView ou abrir externamente
  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    const url = request.url;

    // Abrir links de e-mail, telefone, whatsapp e Stripe Checkout externamente
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('whatsapp:') || url.includes('checkout.stripe.com')) {
      Linking.openURL(url);
      return false;
    }

    // Restringir navegação a domínios autorizados
    try {
      const requestHost = new URL(url).hostname;
      const isAllowedHost = ALLOWED_WEBVIEW_HOSTS.some(host => requestHost === host || requestHost.endsWith(`.${host}`));

      if (!isAllowedHost) {
        // Se o domínio não for permitido, abre externamente
        Linking.openURL(url);
        return false;
      }
    } catch (e) {
      // Em caso de URL inválida, ou erro ao parsear, abre externamente por segurança
      console.warn('Invalid URL or error parsing, opening externally:', url, e);
      Linking.openURL(url);
      return false;
    }

    return true; // Carrega a URL na WebView
  }, []);

  // Renderiza uma tela de erro/offline nativa
  const renderErrorScreen = useCallback(() => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        {networkStatus ? 'Ocorreu um erro ao carregar a página.' : 'Sem conexão com a internet.'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setError(false);
          setLoading(true);
          internalWebViewRef.current?.reload();
        }}
      >
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  ), [networkStatus]);

  // Permissões para upload de arquivos e câmera (Android)
  const onPermissionRequest = useCallback((event: any) => {
    // Para Android, react-native-webview geralmente lida com input file e câmera automaticamente.
    // Se precisar de controle mais granular, pode-se implementar aqui.
    // Exemplo: return event.nativeEvent.resources.includes('CAMERA') || event.nativeEvent.resources.includes('STORAGE');
    return true; // Permite todas as requisições de permissão por padrão
  }, []);

  // Headers customizados para enviar com as requisições da WebView
  const customHeaders = {
    'X-App-Platform': Platform.OS, // 'android' ou 'ios'
    'X-App-Source': 'webview',
    // Para o header 'Authorization', ele geralmente é gerenciado pela própria aplicação web
    // após o login (via cookies ou localStorage). Se você precisar enviar um token nativo
    // do React Native, você precisaria de uma lógica mais complexa para obtê-lo e passá-lo aqui.
    // Ex: 'Authorization': 'Bearer SEU_TOKEN_NATIVO_AQUI',
  };

  return (
    <SafeAreaView style={styles.flexContainer} edges={['top', 'bottom']}>
      {(loading || error || !networkStatus) && (
        <View style={styles.overlay}>
          {error || !networkStatus ? renderErrorScreen() : <Loading />}
        </View>
      )}
      {/* @ts-ignore */}
      <WebView
        ref={internalWebViewRef}
        source={{ uri: WEBVIEW_URL, headers: customHeaders }} // Adiciona os headers customizados
        style={styles.flexContainer}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onHttpError={onHttpError}
        onNavigationStateChange={onNavigationStateChange}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onPermissionRequest={Platform.OS === 'android' ? onPermissionRequest : undefined} // Apenas para Android
        // Configurações para persistência de login
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        javaScriptEnabled={true}
        // Permite upload de arquivos (Android)
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        // User Agent para simular um navegador mobile, se necessário
        // userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1"
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10, // Garante que o overlay fique acima da WebView
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Fundo semi-transparente para o loader/erro
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333333',
  },
  retryButton: {
    backgroundColor: '#6d37a6',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});