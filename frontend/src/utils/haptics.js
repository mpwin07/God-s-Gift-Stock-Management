import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic Feedback Utility
 * Provides consistent haptic feedback across the app
 * Falls back gracefully on web/unsupported platforms
 */

// Check if haptics are supported
const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic - for subtle UI feedback
 * Use for: button presses, toggles, selections
 */
export const lightHaptic = () => {
    if (isSupported) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
};

/**
 * Medium haptic - for confirmations
 * Use for: item added, form submitted
 */
export const mediumHaptic = () => {
    if (isSupported) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
};

/**
 * Heavy haptic - for important actions
 * Use for: item deleted, error occurred
 */
export const heavyHaptic = () => {
    if (isSupported) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
};

/**
 * Success haptic - celebration pattern
 * Use for: bill created, payment received
 */
export const successHaptic = () => {
    if (isSupported) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
};

/**
 * Warning haptic
 * Use for: validation errors, warnings
 */
export const warningHaptic = () => {
    if (isSupported) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
};

/**
 * Error haptic
 * Use for: failed actions, errors
 */
export const errorHaptic = () => {
    if (isSupported) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
};

/**
 * Selection changed haptic
 * Use for: tab switches, picker changes
 */
export const selectionHaptic = () => {
    if (isSupported) {
        Haptics.selectionAsync();
    }
};

export default {
    light: lightHaptic,
    medium: mediumHaptic,
    heavy: heavyHaptic,
    success: successHaptic,
    warning: warningHaptic,
    error: errorHaptic,
    selection: selectionHaptic,
};
