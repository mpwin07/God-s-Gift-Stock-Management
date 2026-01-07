import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, borderRadius } from '../config/theme';

/**
 * BlurModal - Modal with blurred backdrop
 * Falls back to semi-transparent overlay on web
 */
const BlurModal = ({
    visible,
    onClose,
    children,
    animationType = 'fade',
    intensity = 50,
}) => {
    // BlurView doesn't work well on web, use fallback
    const isWeb = Platform.OS === 'web';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType={animationType}
            onRequestClose={onClose}
        >
            {isWeb ? (
                // Web fallback - semi-transparent overlay
                <View style={styles.container}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    <View style={styles.content}>
                        {children}
                    </View>
                </View>
            ) : (
                // Native - Blur effect
                <View style={styles.container}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={onClose}
                    >
                        <BlurView
                            intensity={intensity}
                            tint="dark"
                            style={StyleSheet.absoluteFill}
                        />
                    </TouchableOpacity>
                    <View style={styles.content}>
                        {children}
                    </View>
                </View>
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginHorizontal: spacing.lg,
        maxWidth: 400,
        width: '90%',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
        elevation: 20,
    },
});

export default BlurModal;
