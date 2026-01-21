import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Image,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LineChart } from "react-native-chart-kit";
import Card from '../components/Card';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../config/theme';
import { getDashboardStats, getDashboardAnalytics, getExpenseMonthlyTotals, getBills } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { lightHaptic } from '../utils/haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure Notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [expenseStats, setExpenseStats] = useState({ this_month_expenses: 0, last_month_expenses: 0 });
    const [monthlyBills, setMonthlyBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Animations
    const heroScale = useRef(new Animated.Value(0.9)).current;
    const heroOpacity = useRef(new Animated.Value(0)).current;
    const statsOpacity = useRef(new Animated.Value(0)).current;
    const statsTranslate = useRef(new Animated.Value(20)).current;

    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        registerForPushNotificationsAsync();

        // Listeners for interactions
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            // console.log(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // console.log(response);
            // Could navigate to specific screen
        });

        return () => {
            Notifications.removeNotificationSubscription(notificationListener.current);
            Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, []);

    // Check for alerts when stats load
    useEffect(() => {
        if (stats) {
            checkAlerts(stats);
        }
    }, [stats]);

    const checkAlerts = async (data) => {
        // Cancel any existing scheduled notifications to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Pending Payment Reminder - 12hr intervals
        if (data.total_pending_payments > 0) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "💰 Payment Reminder",
                    body: `${data.total_pending_payments} bills are pending payment.`,
                    data: { screen: 'BillsHistory' },
                },
                trigger: { seconds: 12 * 60 * 60 }, // 12 hours
            });
        }
    };

    async function registerForPushNotificationsAsync() {
        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return;
            }
        } else {
            // alert('Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    }

    const loadDashboardData = async (showToast = false) => {
        try {
            const [statsData, analyticsData, expenseData, billsData] = await Promise.all([
                getDashboardStats(),
                getDashboardAnalytics(30),
                getExpenseMonthlyTotals(),
                getBills({ limit: 200 }),
            ]);

            // Defensive null checks for all data
            setStats(statsData ?? {});
            setAnalytics(analyticsData ?? {});
            setExpenseStats(expenseData ?? { this_month_expenses: 0, last_month_expenses: 0 });
            setMonthlyBills(Array.isArray(billsData) ? billsData : []);

            if (showToast) {
                Toast.show({
                    type: 'success',
                    text1: 'Dashboard Updated',
                    text2: 'Latest data loaded',
                    visibilityTime: 2000,
                });
            }

            // Trigger entrance animations
            animateEntrance();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Set safe defaults on error
            setStats({});
            setAnalytics({});
            setExpenseStats({ this_month_expenses: 0, last_month_expenses: 0 });
            setMonthlyBills([]);
            Toast.show({
                type: 'error',
                text1: 'Failed to load data',
                text2: 'Please check your connection',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const animateEntrance = () => {
        // Hero card animation
        Animated.parallel([
            Animated.spring(heroScale, {
                toValue: 1,
                friction: 8,
                tension: 60,
                useNativeDriver: true,
            }),
            Animated.timing(heroOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        // Stats cards animation (staggered)
        Animated.parallel([
            Animated.timing(statsOpacity, {
                toValue: 1,
                duration: 400,
                delay: 150,
                useNativeDriver: true,
            }),
            Animated.spring(statsTranslate, {
                toValue: 0,
                friction: 8,
                tension: 60,
                delay: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData(true);
    };

    const handleLogout = () => {
        // Use confirm for cross-platform compatibility
        if (typeof window !== 'undefined' && window.confirm) {
            if (window.confirm('Are you sure you want to logout?')) {
                logout();
            }
        } else {
            // Fallback for native
            Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: logout, style: 'destructive' },
            ]);
        }
    };

    const handleQuickAction = (action) => {
        lightHaptic();
        if (action === 'newBill') {
            navigation.navigate('NewBill');
        } else if (action === 'products') {
            navigation.navigate('Products');
        }
    };

    // Calculate this month's sales from daily_sales API (based on payment_completed_date)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dailySalesData = analytics?.daily_sales || [];
    const thisMonthSales = dailySalesData
        .filter(d => new Date(d.date) >= thisMonthStart)
        .reduce((sum, d) => sum + (d.sales || d.total || 0), 0);

    const thisMonthProfit = thisMonthSales - (expenseStats?.this_month_expenses || 0);

    const maxSales = analytics?.product_sales?.length > 0
        ? Math.max(...analytics.product_sales.slice(0, 5).map(p => p.total_sales))
        : 1;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <View style={styles.container}>
            {/* Compact Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View>
                        <Text style={styles.brandName}>God's Gift</Text>
                        <Text style={styles.brandTagline}>Bath Soap</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Greeting */}
                <View style={styles.greetingSection}>
                    <Text style={styles.greeting}>{getGreeting()},</Text>
                    <Text style={styles.userName}>{user?.full_name?.split(' ')[0] || 'Admin'} 👋</Text>
                </View>

                {/* HERO: Today's Sales */}
                <Animated.View style={[
                    styles.heroCard,
                    {
                        opacity: heroOpacity,
                        transform: [{ scale: heroScale }],
                    }
                ]}>
                    <View style={styles.heroGradient}>
                        <View style={styles.heroContent}>
                            <View style={styles.heroHeader}>
                                <View style={styles.heroIconContainer}>
                                    <Text style={styles.heroIcon}>💰</Text>
                                </View>
                                <View style={styles.heroBadge}>
                                    <Text style={styles.heroBadgeText}>Today</Text>
                                </View>
                            </View>
                            <Text style={styles.heroAmount}>
                                ₹{stats?.today_sales?.toFixed(0) || '0'}
                            </Text>
                            <Text style={styles.heroLabel}>Total Sales</Text>
                            <View style={styles.heroFooter}>
                                <Text style={styles.heroStat}>
                                    {stats?.today_bills_count || 0} bills completed
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Mini Stats Row (3-up) */}
                <Animated.View style={[
                    styles.statsRow,
                    {
                        opacity: statsOpacity,
                        transform: [{ translateY: statsTranslate }],
                    }
                ]}>
                    <View style={[styles.miniStat, { backgroundColor: colors.warningLight }]}>
                        <Text style={styles.miniStatIcon}>⏳</Text>
                        <Text style={styles.miniStatValue}>{stats?.total_pending_payments || 0}</Text>
                        <Text style={styles.miniStatLabel}>Pending</Text>
                    </View>

                    <View style={[styles.miniStat, { backgroundColor: colors.errorLight }]}>
                        <Text style={styles.miniStatIcon}>💸</Text>
                        <Text style={styles.miniStatValue}>₹{stats?.total_pending_amount?.toFixed(0) || 0}</Text>
                        <Text style={styles.miniStatLabel}>Due</Text>
                    </View>

                    <View style={[styles.miniStat, { backgroundColor: colors.infoLight }]}>
                        <Text style={styles.miniStatIcon}>🧾</Text>
                        <Text style={styles.miniStatValue}>{stats?.today_bills_count || 0}</Text>
                        <Text style={styles.miniStatLabel}>Bills</Text>
                    </View>
                </Animated.View>

                {/* Monthly Stats 2x2 Grid */}
                <View style={styles.monthlyStatsSection}>
                    <Text style={styles.sectionTitle}>Monthly Overview</Text>
                    <View style={styles.monthlyGrid}>
                        {/* Today Sales */}
                        <View style={[styles.monthlyCard, { backgroundColor: colors.primary }]}>
                            <Text style={styles.monthlyCardIcon}>📊</Text>
                            <Text style={styles.monthlyCardValue}>₹{stats?.today_sales?.toFixed(0) || 0}</Text>
                            <Text style={styles.monthlyCardLabel}>Today Sales</Text>
                        </View>

                        {/* This Month Expenses */}
                        <View style={[styles.monthlyCard, { backgroundColor: '#FF6B6B' }]}>
                            <Text style={styles.monthlyCardIcon}>💸</Text>
                            <Text style={styles.monthlyCardValue}>₹{expenseStats?.this_month_expenses?.toFixed(0) || 0}</Text>
                            <Text style={styles.monthlyCardLabel}>Expenses</Text>
                        </View>

                        {/* This Month Profit */}
                        <View style={[styles.monthlyCard, { backgroundColor: thisMonthProfit >= 0 ? '#51CF66' : '#FF6B6B' }]}>
                            <Text style={styles.monthlyCardIcon}>{thisMonthProfit >= 0 ? '📈' : '📉'}</Text>
                            <Text style={styles.monthlyCardValue}>
                                ₹{thisMonthProfit.toFixed(0)}
                            </Text>
                            <Text style={styles.monthlyCardLabel}>Profit</Text>
                        </View>

                        {/* This Month Sales */}
                        <View style={[styles.monthlyCard, { backgroundColor: colors.textMuted }]}>
                            <Text style={styles.monthlyCardIcon}>💰</Text>
                            <Text style={styles.monthlyCardValueSmall}>₹{thisMonthSales.toFixed(0)}</Text>
                            <Text style={styles.monthlyCardLabel}>Mo. Sales</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleQuickAction('newBill')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.actionIconWrap}>
                                <Text style={styles.actionIcon}>➕</Text>
                            </View>
                            <Text style={styles.actionText}>New Bill</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.actionButtonSecondary]}
                            onPress={() => handleQuickAction('products')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconWrap, styles.actionIconSecondary]}>
                                <Text style={styles.actionIcon}>📦</Text>
                            </View>
                            <Text style={[styles.actionText, styles.actionTextSecondary]}>Products</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sales Trend Chart */}
                {analytics?.daily_sales?.length > 0 && (
                    <View style={styles.chartSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Sales Trend</Text>
                            <Text style={styles.sectionSubtitle}>Last 30 days</Text>
                        </View>

                        <View style={styles.chartCard}>
                            <LineChart
                                data={{
                                    labels: analytics.daily_sales.filter((_, i) => i % 5 === 0).map(d => d.date.slice(8)), // Show day only every 5 days
                                    datasets: [{
                                        data: analytics.daily_sales.map(d => d.sales)
                                    }]
                                }}
                                width={width - layout.screenPadding * 2 - spacing.lg * 2} // Card width
                                height={220}
                                yAxisLabel="₹"
                                yAxisInterval={1}
                                chartConfig={{
                                    backgroundColor: colors.surface,
                                    backgroundGradientFrom: colors.surface,
                                    backgroundGradientTo: colors.surface,
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => colors.primary,
                                    labelColor: (opacity = 1) => colors.textSecondary,
                                    style: {
                                        borderRadius: 16
                                    },
                                    propsForDots: {
                                        r: "4",
                                        strokeWidth: "2",
                                        stroke: colors.primary
                                    },
                                    propsForBackgroundLines: {
                                        strokeDasharray: "" // solid lines
                                    }
                                }}
                                bezier
                                style={{
                                    borderRadius: 16,
                                    alignSelf: 'center',
                                    marginVertical: 8
                                }}
                            />
                        </View>
                    </View>
                )}

                {/* Top Products */}
                {analytics?.product_sales?.length > 0 && (
                    <View style={styles.chartSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Top Products</Text>
                            <Text style={styles.sectionSubtitle}>By Value</Text>
                        </View>

                        <View style={styles.chartCard}>
                            {analytics.product_sales.slice(0, 5).map((product, index) => {
                                const maxSales = Math.max(...analytics.product_sales.map(p => p.total_sales));
                                const barWidth = (product.total_sales / maxSales) * 100;
                                return (
                                    <View key={index} style={styles.barRow}>
                                        <View style={styles.barInfo}>
                                            <Text style={styles.barRank}>#{index + 1}</Text>
                                            <Text style={styles.barName} numberOfLines={1}>
                                                {product.product_name}
                                            </Text>
                                        </View>
                                        <View style={styles.barContainer}>
                                            <Animated.View
                                                style={[
                                                    styles.bar,
                                                    { width: `${barWidth}%` }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.barValue}>
                                            ₹{product.total_sales.toFixed(0)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Spacer for bottom */}
                <View style={{ height: spacing.xxl }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: layout.screenPadding,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
    },
    brandName: {
        ...typography.h3,
        color: colors.text,
    },
    brandTagline: {
        ...typography.caption,
        color: colors.textMuted,
    },
    logoutButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.round,
        ...shadows.sm,
    },
    logoutText: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: layout.screenPadding,
    },

    // Greeting
    greetingSection: {
        marginBottom: spacing.lg,
    },
    greeting: {
        ...typography.body,
        color: colors.textMuted,
    },
    userName: {
        ...typography.h1,
        color: colors.text,
    },

    // Hero Card
    heroCard: {
        marginBottom: spacing.lg,
    },
    heroGradient: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xxl,
        overflow: 'hidden',
        ...shadows.lg,
    },
    heroContent: {
        padding: spacing.xl,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    heroIconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroIcon: {
        fontSize: 24,
    },
    heroBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: borderRadius.round,
    },
    heroBadgeText: {
        ...typography.micro,
        color: '#FFFFFF',
    },
    heroAmount: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    heroLabel: {
        ...typography.body,
        color: 'rgba(255,255,255,0.8)',
        marginTop: spacing.xxs,
    },
    heroFooter: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    heroStat: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.7)',
    },

    // Mini Stats
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    miniStat: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        ...shadows.sm,
    },
    miniStatIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    miniStatValue: {
        ...typography.h2,
        color: colors.text,
    },
    miniStatLabel: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: spacing.xxs,
    },

    // Quick Actions
    quickActionsSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.md,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xl,
        ...shadows.md,
    },
    actionButtonSecondary: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconSecondary: {
        backgroundColor: colors.lightPink,
    },
    actionIcon: {
        fontSize: 18,
    },
    actionText: {
        ...typography.bodyBold,
        color: '#FFFFFF',
    },
    actionTextSecondary: {
        color: colors.text,
    },

    // Chart Section
    chartSection: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionSubtitle: {
        ...typography.caption,
        color: colors.textMuted,
    },
    chartCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        ...shadows.sm,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    barInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
    },
    barRank: {
        ...typography.micro,
        color: colors.textMuted,
        width: 28,
    },
    barName: {
        ...typography.caption,
        color: colors.text,
        flex: 1,
    },
    barContainer: {
        flex: 1,
        height: 8,
        backgroundColor: colors.lightPink,
        borderRadius: borderRadius.round,
        marginHorizontal: spacing.sm,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.round,
    },
    barValue: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
        width: 60,
        textAlign: 'right',
    },

    // Monthly stats 2x2 grid
    monthlyStatsSection: {
        marginBottom: spacing.lg,
    },
    monthlyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    monthlyCard: {
        width: (width - layout.screenPadding * 2 - spacing.sm) / 2,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    monthlyCardIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    monthlyCardValue: {
        ...typography.h2,
        color: '#FFFFFF',
        marginBottom: spacing.xxs,
    },
    monthlyCardValueSmall: {
        ...typography.h3,
        color: '#FFFFFF',
        marginBottom: spacing.xxs,
    },
    monthlyCardLabel: {
        ...typography.micro,
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

export default DashboardScreen;
