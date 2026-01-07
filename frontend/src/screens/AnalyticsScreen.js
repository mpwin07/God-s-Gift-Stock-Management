import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from "react-native-chart-kit";
import Toast from 'react-native-toast-message';
import Card from '../components/Card';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../config/theme';
import { getDashboardAnalytics, getExpenseMonthlyTotals, getBills } from '../api/endpoints';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
    const [analytics, setAnalytics] = useState(null);
    const [expenseStats, setExpenseStats] = useState({ this_month_expenses: 0, last_month_expenses: 0 });
    const [monthlyBills, setMonthlyBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const [analyticsData, expenseData, billsData] = await Promise.all([
                getDashboardAnalytics(30),
                getExpenseMonthlyTotals(),
                getBills({ limit: 500 }),
            ]);
            setAnalytics(analyticsData);
            setExpenseStats(expenseData);
            setMonthlyBills(billsData);
        } catch (error) {
            console.error('Error loading analytics:', error);
            Toast.show({ type: 'error', text1: 'Failed to load analytics' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Calculate monthly sales from daily_sales API data (based on payment_completed_date)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Use daily_sales from API - this is now based on payment_completed_date
    const dailySalesData = analytics?.daily_sales || [];

    const thisMonthSales = dailySalesData
        .filter(d => new Date(d.date) >= thisMonthStart)
        .reduce((sum, d) => sum + (d.sales || d.total || 0), 0);

    const lastMonthSales = dailySalesData
        .filter(d => {
            const date = new Date(d.date);
            return date >= lastMonthStart && date < thisMonthStart;
        })
        .reduce((sum, d) => sum + (d.sales || d.total || 0), 0);

    // Calculate profits
    const thisMonthProfit = thisMonthSales - (expenseStats.this_month_expenses || 0);
    const lastMonthProfit = lastMonthSales - (expenseStats.last_month_expenses || 0);

    // Prepare chart data
    const chartData = dailySalesData.slice(-7).map(d => ({
        label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric' }),
        value: d.sales || d.total || 0,
    }));

    // Day-by-day breakdown from API data
    const dailySalesList = dailySalesData
        .filter(d => new Date(d.date) >= thisMonthStart && (d.sales || d.total) > 0)
        .slice(-15)
        .map(d => [
            new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            d.sales || d.total || 0
        ]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Analytics</Text>
                <Text style={styles.headerSubtitle}>Sales & Profit Overview</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Monthly Summary Cards */}
                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>This Month</Text>
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                            <Text style={styles.summaryIcon}>💰</Text>
                            <Text style={styles.summaryValue}>₹{thisMonthSales.toFixed(0)}</Text>
                            <Text style={styles.summaryLabel}>Total Sales</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#FF6B6B' }]}>
                            <Text style={styles.summaryIcon}>💸</Text>
                            <Text style={styles.summaryValue}>₹{(expenseStats.this_month_expenses || 0).toFixed(0)}</Text>
                            <Text style={styles.summaryLabel}>Expenses</Text>
                        </View>
                    </View>
                    <View style={[styles.profitCard, { backgroundColor: thisMonthProfit >= 0 ? '#51CF66' : '#FF6B6B' }]}>
                        <Text style={styles.profitIcon}>{thisMonthProfit >= 0 ? '📈' : '📉'}</Text>
                        <View>
                            <Text style={styles.profitLabel}>Net Profit</Text>
                            <Text style={styles.profitValue}>₹{thisMonthProfit.toFixed(0)}</Text>
                        </View>
                    </View>
                </View>

                {/* Last Month Comparison */}
                <View style={styles.lastMonthSection}>
                    <Text style={styles.sectionTitle}>Last Month</Text>
                    <View style={styles.lastMonthRow}>
                        <View style={styles.lastMonthItem}>
                            <Text style={styles.lastMonthValue}>₹{lastMonthSales.toFixed(0)}</Text>
                            <Text style={styles.lastMonthLabel}>Sales</Text>
                        </View>
                        <View style={styles.lastMonthDivider} />
                        <View style={styles.lastMonthItem}>
                            <Text style={styles.lastMonthValue}>₹{(expenseStats.last_month_expenses || 0).toFixed(0)}</Text>
                            <Text style={styles.lastMonthLabel}>Expenses</Text>
                        </View>
                        <View style={styles.lastMonthDivider} />
                        <View style={styles.lastMonthItem}>
                            <Text style={[styles.lastMonthValue, { color: lastMonthProfit >= 0 ? '#51CF66' : '#FF6B6B' }]}>
                                ₹{lastMonthProfit.toFixed(0)}
                            </Text>
                            <Text style={styles.lastMonthLabel}>Profit</Text>
                        </View>
                    </View>
                </View>

                {/* Sales Graph */}
                {chartData.length > 0 && (
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>Daily Sales (Last 7 Days)</Text>
                        <LineChart
                            data={{
                                labels: chartData.map(d => d.label),
                                datasets: [{ data: chartData.map(d => d.value || 0) }]
                            }}
                            width={width - layout.screenPadding * 2}
                            height={180}
                            chartConfig={{
                                backgroundColor: colors.surface,
                                backgroundGradientFrom: colors.surface,
                                backgroundGradientTo: colors.surface,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(232, 91, 117, ${opacity})`,
                                labelColor: (opacity = 1) => colors.textSecondary,
                                style: { borderRadius: 16 },
                                propsForDots: {
                                    r: "4",
                                    strokeWidth: "2",
                                    stroke: colors.primary
                                }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                )}

                {/* Daily Breakdown */}
                <View style={styles.dailySection}>
                    <Text style={styles.sectionTitle}>Day-by-Day Sales</Text>
                    {dailySalesList.map(([date, amount], index) => (
                        <View key={index} style={styles.dailyRow}>
                            <Text style={styles.dailyDate}>{date}</Text>
                            <Text style={styles.dailyAmount}>₹{amount.toFixed(0)}</Text>
                        </View>
                    ))}
                    {dailySalesList.length === 0 && (
                        <Text style={styles.emptyText}>No sales this month yet</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: layout.screenPadding,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        ...typography.h1,
        color: colors.text,
    },
    headerSubtitle: {
        ...typography.caption,
        color: colors.textMuted,
    },
    scrollContent: {
        paddingHorizontal: layout.screenPadding,
        paddingBottom: spacing.xxl,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    summarySection: {
        marginBottom: spacing.lg,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    summaryIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    summaryValue: {
        ...typography.h2,
        color: '#FFFFFF',
    },
    summaryLabel: {
        ...typography.micro,
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
    },
    profitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.md,
        ...shadows.sm,
    },
    profitIcon: {
        fontSize: 36,
    },
    profitLabel: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.85)',
    },
    profitValue: {
        ...typography.h1,
        color: '#FFFFFF',
    },
    lastMonthSection: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        ...shadows.sm,
    },
    lastMonthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMonthItem: {
        flex: 1,
        alignItems: 'center',
    },
    lastMonthValue: {
        ...typography.h3,
        color: colors.text,
    },
    lastMonthLabel: {
        ...typography.micro,
        color: colors.textMuted,
    },
    lastMonthDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
    },
    chartSection: {
        marginBottom: spacing.lg,
    },
    chart: {
        borderRadius: borderRadius.lg,
    },
    dailySection: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    dailyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dailyDate: {
        ...typography.body,
        color: colors.text,
    },
    dailyAmount: {
        ...typography.bodyBold,
        color: colors.primary,
    },
    emptyText: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
});

export default AnalyticsScreen;
