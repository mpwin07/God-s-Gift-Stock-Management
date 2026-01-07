import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import toastConfig from './src/components/ToastConfig';

export default function App() {
    return (
        <AuthProvider>
            <StatusBar style="light" />
            <AppNavigator />
            <Toast config={toastConfig} position="top" topOffset={60} />
        </AuthProvider>
    );
}
