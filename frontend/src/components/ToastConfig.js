import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

// Custom toast configurations for react-native-toast-message
export const toastConfig = {
    success: ({ text1, text2, props }) => (
        <Animated.View style={[styles.container, styles.success]}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>✓</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{text1}</Text>
                {text2 && <Text style={styles.message}>{text2}</Text>}
            </View>
        </Animated.View>
    ),

    error: ({ text1, text2, props }) => (
        <Animated.View style={[styles.container, styles.error]}>
            <View style={[styles.iconContainer, styles.errorIcon]}>
                <Text style={styles.icon}>✕</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{text1}</Text>
                {text2 && <Text style={styles.message}>{text2}</Text>}
            </View>
        </Animated.View>
    ),

    info: ({ text1, text2, props }) => (
        <Animated.View style={[styles.container, styles.info]}>
            <View style={[styles.iconContainer, styles.infoIcon]}>
                <Text style={styles.icon}>ℹ</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{text1}</Text>
                {text2 && <Text style={styles.message}>{text2}</Text>}
            </View>
        </Animated.View>
    ),

    warning: ({ text1, text2, props }) => (
        <Animated.View style={[styles.container, styles.warning]}>
            <View style={[styles.iconContainer, styles.warningIcon]}>
                <Text style={styles.icon}>⚠</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{text1}</Text>
                {text2 && <Text style={styles.message}>{text2}</Text>}
            </View>
        </Animated.View>
    ),
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
        borderWidth: 1,
        minWidth: 300,
    },
    success: {
        borderColor: colors.success,
        backgroundColor: '#F0FDF4',
    },
    error: {
        borderColor: colors.error,
        backgroundColor: '#FEF2F2',
    },
    info: {
        borderColor: colors.info,
        backgroundColor: '#EFF6FF',
    },
    warning: {
        borderColor: colors.warning,
        backgroundColor: '#FFFBEB',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.round,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    errorIcon: {
        backgroundColor: colors.error,
    },
    infoIcon: {
        backgroundColor: colors.info,
    },
    warningIcon: {
        backgroundColor: colors.warning,
    },
    icon: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    message: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default toastConfig;
