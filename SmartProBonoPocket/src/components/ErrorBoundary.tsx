import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { trackError } from '../lib/analytics';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackError('error_boundary.triggered', error, {
      componentStack: info.componentStack ?? null,
    });
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Tap below to try again.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F7F9FB',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F2B46',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: '#5C7A85',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#3FAE9D',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
