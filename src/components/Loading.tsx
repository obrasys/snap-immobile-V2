import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Componente de carregamento nativo.
 * Exibe um spinner de atividade enquanto o conteúdo da WebView está carregando.
 */
export const Loading = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#6d37a6" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Cor de fundo branca para combinar com o tema
  },
});