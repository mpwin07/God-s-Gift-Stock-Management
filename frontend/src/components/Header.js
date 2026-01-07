import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../config/theme';

const Header = ({ title, subtitle, onBackPress, rightComponent }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleBackPressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handleBackPressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {onBackPress && (
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <TouchableOpacity
                            onPress={onBackPress}
                            onPressIn={handleBackPressIn}
                            onPressOut={handleBackPressOut}
                            style={styles.backButton}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.backText}>←</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
        paddingTop: 50,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.md,
        // Subtle bottom shadow
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: spacing.md,
        padding: spacing.xs,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    backText: {
        fontSize: fontSize.xxl,
        color: '#FFFFFF',
        fontWeight: '300',
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 4,
        letterSpacing: 0.3,
    },
    rightComponent: {
        marginLeft: spacing.md,
    },
});

export default Header;
