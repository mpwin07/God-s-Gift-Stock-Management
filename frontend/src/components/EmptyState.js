import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Button from './Button';
import { colors, spacing, fontSize, borderRadius } from '../config/theme';

const EmptyState = ({
    icon = '📭',
    title = 'Nothing here yet',
    message = 'Get started by adding some items',
    actionLabel,
    onAction,
    style,
}) => {
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceAnim, {
                        toValue: -10,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.container,
                style,
                { opacity: fadeAnim },
            ]}
        >
            <Animated.View
                style={[
                    styles.iconContainer,
                    { transform: [{ translateY: bounceAnim }] },
                ]}
            >
                <Text style={styles.icon}>{icon}</Text>
            </Animated.View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    style={styles.actionButton}
                />
            )}
        </Animated.View>
    );
};

// Pre-built empty states for different screens
export const EmptyProducts = ({ onAdd }) => (
    <EmptyState
        icon="📦"
        title="No Products Yet"
        message="Add your first product to get started"
        actionLabel="+ Add Product"
        onAction={onAdd}
    />
);

export const EmptyBills = () => (
    <EmptyState
        icon="🧾"
        title="No Bills Found"
        message="Bills you create will appear here"
    />
);

export const EmptyItems = ({ onAdd }) => (
    <EmptyState
        icon="🛒"
        title="No Items Added"
        message="Add items to create a bill"
        actionLabel="+ Add Item"
        onAction={onAdd}
    />
);

export const EmptyStockAlerts = () => (
    <EmptyState
        icon="✅"
        title="All Stock Levels OK"
        message="No low stock alerts at the moment"
    />
);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        paddingVertical: spacing.xxl,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.round,
        backgroundColor: colors.lightPink,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        // Subtle shadow
        shadowColor: '#5F1010',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 4,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },
    actionButton: {
        marginTop: spacing.lg,
        minWidth: 160,
    },
});

export default EmptyState;
