import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Card from './Card';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

const ProductCard = ({ product, onPress, onEdit, index = 0 }) => {
    const { name, category, unit, rate, is_active } = product;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(index * 50),
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    const getCategoryEmoji = () => {
        return category === 'Food' ? '🍎' : '🧼';
    };

    const getCategoryColor = () => {
        return category === 'Food' ? '#4CAF50' : colors.secondary;
    };

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [
                    { translateX: slideAnim },
                    { scale: scaleAnim },
                ],
            }}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <Card style={[styles.card, !is_active && styles.inactive]}>
                    <View style={styles.header}>
                        <View style={styles.emojiContainer}>
                            <Text style={styles.emoji}>{getCategoryEmoji()}</Text>
                        </View>
                        <View style={styles.titleContainer}>
                            <Text style={styles.name}>{name}</Text>
                            <View style={[styles.badge, { backgroundColor: getCategoryColor() }]}>
                                <Text style={styles.badgeText}>{category}</Text>
                            </View>
                        </View>
                        {onEdit && (
                            <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                                <Text style={styles.editText}>✎</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.details}>
                        <Text style={styles.detailText}>Unit: {unit}</Text>
                        <View style={styles.rateContainer}>
                            <Text style={styles.rateLabel}>Rate</Text>
                            <Text style={styles.rateText}>
                                ₹{rate ? rate.toFixed(2) : '—'}
                            </Text>
                        </View>
                    </View>
                    {!is_active && (
                        <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveText}>Inactive</Text>
                        </View>
                    )}
                </Card>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: spacing.md,
    },
    inactive: {
        opacity: 0.6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    emojiContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.lightPink,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    emoji: {
        fontSize: 22,
    },
    titleContainer: {
        flex: 1,
    },
    name: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.round,
    },
    badgeText: {
        fontSize: fontSize.xs,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    editButton: {
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.lightPink,
    },
    editText: {
        fontSize: fontSize.lg,
        color: colors.primary,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.lightPink,
    },
    detailText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    rateContainer: {
        alignItems: 'flex-end',
    },
    rateLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    rateText: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.primary,
    },
    inactiveBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        backgroundColor: colors.error,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    inactiveText: {
        fontSize: fontSize.xs,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default ProductCard;
