import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, borderRadius, spacing } from '../config/theme';

// Shimmer animation for skeleton loaders
const Skeleton = ({
    width = '100%',
    height = 20,
    borderRadius: radius = borderRadius.md,
    style,
}) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: false,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: false,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const backgroundColor = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.lightPink, '#FFF5F7'],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius: radius,
                    backgroundColor,
                },
                style,
            ]}
        />
    );
};

// Pre-built skeleton patterns
export const SkeletonCard = () => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Skeleton width={44} height={44} borderRadius={borderRadius.lg} />
            <View style={styles.cardHeaderText}>
                <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={12} />
            </View>
        </View>
        <View style={styles.cardBody}>
            <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="70%" height={14} />
        </View>
    </View>
);

export const SkeletonStatsCard = () => (
    <View style={styles.statsCard}>
        <View style={{ flex: 1 }}>
            <Skeleton width="50%" height={14} style={{ marginBottom: 12 }} />
            <Skeleton width="70%" height={28} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={56} height={56} borderRadius={borderRadius.lg} />
    </View>
);

export const SkeletonList = ({ count = 3 }) => (
    <View>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </View>
);

export const SkeletonDashboard = () => (
    <View style={styles.dashboard}>
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <View style={styles.chartSkeleton}>
            <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={200} borderRadius={borderRadius.lg} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 143, 143, 0.1)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    cardBody: {
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.lightPink,
    },
    statsCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 143, 143, 0.1)',
    },
    dashboard: {
        padding: spacing.md,
    },
    chartSkeleton: {
        marginTop: spacing.md,
    },
});

export default Skeleton;
