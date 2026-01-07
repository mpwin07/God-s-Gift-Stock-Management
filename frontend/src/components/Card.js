import React, { useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors, borderRadius, shadows, spacing } from '../config/theme';

const Card = ({
    children,
    style,
    noPadding = false,
    onPress,
    pressable = false,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const cardContent = (
        <Animated.View
            style={[
                styles.card,
                noPadding && styles.noPadding,
                style,
                (pressable || onPress) && {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );

    if (onPress || pressable) {
        return (
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {cardContent}
            </TouchableOpacity>
        );
    }

    return cardContent;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        ...shadows.md,
        // Subtle inner glow effect
        borderWidth: 1,
        borderColor: 'rgba(255, 143, 143, 0.1)',
    },
    noPadding: {
        padding: 0,
    },
});

export default Card;
