import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

const BillItem = ({ item, index, isNew = false, onRemove }) => {
    // ... animation refs ...
    const fadeAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
    const slideAnim = useRef(new Animated.Value(isNew ? 50 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(isNew ? 0.9 : 1)).current;
    const glowAnim = useRef(new Animated.Value(isNew ? 1 : 0)).current;

    useEffect(() => {
        if (isNew) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
            ]).start();
            Animated.timing(glowAnim, { toValue: 0, duration: 1000, delay: 300, useNativeDriver: false }).start();
        }
    }, [isNew]);

    const animatedGlow = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', colors.secondary],
    });

    const rate = item.rate ?? item.unit_price ?? 0;
    const quantity = item.quantity ?? 1;
    const itemTotal = item.item_total ?? (quantity * rate);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
                    borderColor: animatedGlow,
                },
            ]}
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.indexBadge}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.productName} numberOfLines={1}>
                        {item.product_name}
                    </Text>
                </View>
                {onRemove && (
                    <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
                        <Text style={styles.removeIcon}>🗑️</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>
                    {item.grams ? `${item.grams}g • ` : ''}{quantity} × ₹{rate.toFixed(2)}
                </Text>
                <Text style={styles.total}>₹{itemTotal.toFixed(2)}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: colors.lightPink,
        shadowColor: '#5F1010',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    indexBadge: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    indexText: {
        fontSize: fontSize.sm,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    productName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    },
    removeBtn: {
        padding: spacing.xs,
    },
    removeIcon: {
        fontSize: 18,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 28 + spacing.sm,
    },
    detailText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    total: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.primary,
    },
});

export default BillItem;
