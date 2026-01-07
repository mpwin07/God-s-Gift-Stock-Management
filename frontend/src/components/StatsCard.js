import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Card from './Card';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '../config/theme';

const StatsCard = ({ title, value, subtitle, icon, color, delay = 0 }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                ],
            }}
        >
            <Card style={styles.card} pressable>
                <View style={styles.content}>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={[styles.value, color && { color }]}>{value}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {icon && (
                        <View style={[styles.iconContainer, color && { backgroundColor: `${color}20` }]}>
                            <Text style={styles.iconText}>{icon}</Text>
                        </View>
                    )}
                </View>
            </Card>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: spacing.md,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        fontWeight: '500',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.primary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: fontSize.xs,
        color: colors.textLight,
        marginTop: spacing.xs,
    },
    iconContainer: {
        marginLeft: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.lightPink,
    },
    iconText: {
        fontSize: 28,
    },
});

export default StatsCard;
