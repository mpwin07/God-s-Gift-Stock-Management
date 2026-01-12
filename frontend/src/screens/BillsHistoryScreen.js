import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Animated,
    Modal,
    TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../config/theme';
import { getBills, getPaymentByBill, updatePayment } from '../api/endpoints';
import { lightHaptic, successHaptic, mediumHaptic } from '../utils/haptics';

const BillsHistoryScreen = ({ navigation }) => {
    const [bills, setBills] = useState([]);
    const [payments, setPayments] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    // Payment mode modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Customer history modal
    const [showCustomerHistory, setShowCustomerHistory] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Tab indicator animation
    const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

    const loadBills = async () => {
        try {
            const data = await getBills({ limit: 100 });

            // Defensive check - ensure data is always an array
            const billsArray = Array.isArray(data) ? data : [];
            console.log('[DEBUG] Loaded bills:', billsArray.length);
            setBills(billsArray);

            const paymentData = {};
            for (const bill of billsArray) {
                try {
                    const payment = await getPaymentByBill(bill.id);
                    paymentData[bill.id] = payment;
                } catch (e) {
                    // Default: both pending
                    paymentData[bill.id] = {
                        payment_status: 'Pending',
                        delivery_status: 'Pending',
                    };
                }
            }
            setPayments(paymentData);
        } catch (error) {
            console.error('Error loading bills:', error);
            // Set empty array on error to prevent crash
            setBills([]);
            Toast.show({ type: 'error', text1: 'Failed to load bills' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { loadBills(); }, []));

    const onRefresh = () => {
        setRefreshing(true);
        loadBills();
    };

    const getPaymentStatus = (billId) => payments[billId]?.payment_status || 'Pending';
    const getDeliveryStatus = (billId) => payments[billId]?.delivery_status || 'Pending';

    const isPaymentDone = (billId) => getPaymentStatus(billId) === 'Completed';
    const isDeliveryDone = (billId) => getDeliveryStatus(billId) === 'Completed';

    // Toggle Payment Status
    const togglePayment = async (bill) => {
        mediumHaptic();
        const isCurrentlyPaid = isPaymentDone(bill.id);

        if (!isCurrentlyPaid) {
            // Show payment mode selector
            setSelectedBillForPayment(bill);
            setShowPaymentModal(true);
        } else {
            // Unmark as paid
            const payment = payments[bill.id];
            try {
                if (payment?.id) {
                    await updatePayment(payment.id, {
                        payment_status: 'Pending',
                        amount_paid: 0,
                    });
                }
                setPayments(prev => ({
                    ...prev,
                    [bill.id]: { ...prev[bill.id], payment_status: 'Pending' }
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Update Failed' });
            }
        }
    };

    // Confirm payment with mode
    const confirmPaymentWithMode = async (mode) => {
        const bill = selectedBillForPayment;
        const payment = payments[bill.id];

        try {
            if (payment?.id) {
                await updatePayment(payment.id, {
                    payment_status: 'Completed',
                    amount_paid: bill.bill_total,
                    payment_mode: mode,
                });
            }

            setPayments(prev => ({
                ...prev,
                [bill.id]: {
                    ...prev[bill.id],
                    payment_status: 'Completed',
                    delivery_status: 'Completed',
                    payment_mode: mode,
                }
            }));

            successHaptic();
            Toast.show({
                type: 'success',
                text1: `💰 Paid via ${mode}!`,
                text2: 'Payment recorded for today'
            });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Update Failed' });
        } finally {
            setShowPaymentModal(false);
            setSelectedBillForPayment(null);
        }
    };

    // Toggle Delivery Status
    const toggleDelivery = async (bill) => {
        mediumHaptic();
        const payment = payments[bill.id];
        const newStatus = isDeliveryDone(bill.id) ? 'Pending' : 'Completed';

        try {
            if (payment?.id) {
                await updatePayment(payment.id, {
                    delivery_status: newStatus,
                });
            }

            setPayments(prev => ({
                ...prev,
                [bill.id]: { ...prev[bill.id], delivery_status: newStatus }
            }));

            if (newStatus === 'Completed') {
                successHaptic();
                Toast.show({ type: 'success', text1: '📦 Product Delivered!' });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Update Failed' });
        }
    };

    const handleTabChange = (newFilter, index) => {
        lightHaptic();
        setFilter(newFilter);
        Animated.spring(tabIndicatorAnim, {
            toValue: index,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
        }).start();
    };

    // Group bills by date
    const groupBillsByDate = (billsList) => {
        const groups = {};
        billsList.forEach(bill => {
            const date = new Date(bill.bill_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(bill);
        });

        return Object.entries(groups)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, items]) => ({ date, items }));
    };

    // Filter logic - more detailed categories
    // In Progress: Prep pending (delivery_status != Completed)
    // Delivered: Prep done but unpaid (delivery_status == Completed AND payment_status != Completed)
    // Done: Both paid (payment_status == Completed)

    // First apply search filter
    const searchLower = searchQuery.toLowerCase().trim();
    const searchedBills = searchLower
        ? bills.filter(b =>
            b.customer_name?.toLowerCase().includes(searchLower) ||
            b.bill_number?.toLowerCase().includes(searchLower)
        )
        : bills;

    const inProgressBills = searchedBills.filter(b => !isDeliveryDone(b.id));
    const deliveredBills = searchedBills.filter(b => isDeliveryDone(b.id) && !isPaymentDone(b.id));
    const doneBills = searchedBills.filter(b => isPaymentDone(b.id));

    const filteredBills =
        filter === 'inprogress' ? inProgressBills :
            filter === 'delivered' ? deliveredBills :
                filter === 'done' ? doneBills :
                    searchedBills;

    const groupedBills = groupBillsByDate(filteredBills);

    // Get customer's past orders for history modal
    const customerOrders = selectedCustomer
        ? bills.filter(b => b.customer_name?.toLowerCase() === selectedCustomer.toLowerCase())
        : [];

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Bill Card with TWO status toggles
    const BillCard = ({ item }) => {
        const scaleAnim = useRef(new Animated.Value(1)).current;
        const paymentDone = isPaymentDone(item.id);
        const deliveryDone = isDeliveryDone(item.id);

        const handlePress = () => {
            lightHaptic();
            navigation.navigate('BillDetail', { billId: item.id });
        };

        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={styles.billCard}
                    onPress={handlePress}
                    onPressIn={() => {
                        Animated.spring(scaleAnim, {
                            toValue: 0.98,
                            friction: 8,
                            useNativeDriver: true,
                        }).start();
                    }}
                    onPressOut={() => {
                        Animated.spring(scaleAnim, {
                            toValue: 1,
                            friction: 5,
                            useNativeDriver: true,
                        }).start();
                    }}
                    activeOpacity={1}
                >
                    {/* Header */}
                    <View style={styles.billHeader}>
                        <View style={styles.billInfo}>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setSelectedCustomer(item.customer_name);
                                    setShowCustomerHistory(true);
                                    lightHaptic();
                                }}
                            >
                                <Text style={[styles.customerName, styles.customerNameTappable]}>
                                    {item.customer_name}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.billMeta}>
                                {item.bill_number} · {formatTime(item.bill_date)}
                            </Text>
                        </View>
                        <Text style={styles.billAmount}>₹{(item.bill_total ?? 0).toFixed(0)}</Text>
                    </View>

                    {/* TWO BIG STATUS BUTTONS */}
                    <View style={styles.statusButtons}>
                        {/* Preparation Status */}
                        <TouchableOpacity
                            style={[
                                styles.statusBtn,
                                deliveryDone ? styles.statusBtnDone : styles.statusBtnPending
                            ]}
                            onPress={() => toggleDelivery(item)}
                        >
                            <Text style={[
                                styles.statusLabel,
                                deliveryDone && styles.statusLabelDone
                            ]}>
                                {deliveryDone ? '✅ READY' : '📦 PREP'}
                            </Text>
                        </TouchableOpacity>

                        {/* Payment Status */}
                        <TouchableOpacity
                            style={[
                                styles.statusBtn,
                                paymentDone ? styles.statusBtnDone : styles.statusBtnPending
                            ]}
                            onPress={() => togglePayment(item)}
                        >
                            <Text style={[
                                styles.statusLabel,
                                paymentDone && styles.statusLabelDone
                            ]}>
                                {paymentDone ? '✅ PAID' : '💰 UNPAID'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const tabs = [
        { key: 'all', label: 'All', count: bills.length },
        { key: 'inprogress', label: '🔄 Prep', count: inProgressBills.length },
        { key: 'delivered', label: '📦 Ready', count: deliveredBills.length },
        { key: 'done', label: '✅ Paid', count: doneBills.length },
    ];

    const TAB_WIDTH = 85; // Smaller width for 4 tabs
    const indicatorTranslate = tabIndicatorAnim.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [0, TAB_WIDTH, TAB_WIDTH * 2, TAB_WIDTH * 3],
    });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bills</Text>
                <Text style={styles.headerSubtitle}>
                    {bills.length} total · ₹{bills.reduce((sum, b) => sum + (b.bill_total ?? 0), 0).toFixed(0)}
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍 Search by name or bill #"
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        style={styles.searchClear}
                        onPress={() => setSearchQuery('')}
                    >
                        <Text style={styles.searchClearText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Pill Tabs */}
            <View style={styles.tabContainer}>
                <View style={styles.tabBackground}>
                    <Animated.View
                        style={[
                            styles.tabIndicator,
                            { transform: [{ translateX: indicatorTranslate }] }
                        ]}
                    />
                    {tabs.map((tab, index) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tab}
                            onPress={() => handleTabChange(tab.key, index)}
                        >
                            <Text style={[
                                styles.tabText,
                                filter === tab.key && styles.tabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                            <Text style={[
                                styles.tabCount,
                                filter === tab.key && styles.tabCountActive
                            ]}>
                                {tab.count}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Timeline List */}
            <FlatList
                data={groupedBills}
                keyExtractor={(item) => item.date}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item: group }) => (
                    <View style={styles.dateGroup}>
                        <View style={styles.dateDivider}>
                            <View style={styles.dateLine} />
                            <Text style={styles.dateText}>{group.date}</Text>
                            <View style={styles.dateLine} />
                        </View>
                        {group.items.map((bill) => (
                            <BillCard key={bill.id?.toString()} item={bill} />
                        ))}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🧾</Text>
                        <Text style={styles.emptyTitle}>No Bills Found</Text>
                        <Text style={styles.emptyText}>
                            {filter === 'pending' ? 'No pending bills' :
                                filter === 'completed' ? 'No completed bills' :
                                    'Bills will appear here'}
                        </Text>
                    </View>
                }
            />

            {/* Payment Mode Modal */}
            <Modal visible={showPaymentModal} transparent animationType="fade">
                <View style={styles.paymentModalOverlay}>
                    <View style={styles.paymentModalContent}>
                        <Text style={styles.paymentModalTitle}>Select Payment Mode</Text>
                        <Text style={styles.paymentModalSubtitle}>
                            ₹{selectedBillForPayment?.bill_total?.toFixed(0)} for {selectedBillForPayment?.customer_name}
                        </Text>

                        <View style={styles.paymentModeButtons}>
                            <TouchableOpacity
                                style={[styles.paymentModeBtn, { backgroundColor: '#4CAF50' }]}
                                onPress={() => confirmPaymentWithMode('COD')}
                            >
                                <Text style={styles.paymentModeIcon}>💵</Text>
                                <Text style={styles.paymentModeText}>COD</Text>
                                <Text style={styles.paymentModeSubtext}>Cash on Delivery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.paymentModeBtn, { backgroundColor: '#2196F3' }]}
                                onPress={() => confirmPaymentWithMode('GPay')}
                            >
                                <Text style={styles.paymentModeIcon}>📱</Text>
                                <Text style={styles.paymentModeText}>GPay</Text>
                                <Text style={styles.paymentModeSubtext}>Google Pay</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.paymentModalCancel}
                            onPress={() => {
                                setShowPaymentModal(false);
                                setSelectedBillForPayment(null);
                            }}
                        >
                            <Text style={styles.paymentModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Customer History Modal */}
            <Modal visible={showCustomerHistory} transparent animationType="slide">
                <View style={styles.paymentModalOverlay}>
                    <View style={styles.customerHistoryContent}>
                        <View style={styles.customerHistoryHeader}>
                            <Text style={styles.customerHistoryTitle}>📋 {selectedCustomer}</Text>
                            <TouchableOpacity onPress={() => {
                                setShowCustomerHistory(false);
                                setSelectedCustomer(null);
                            }}>
                                <Text style={styles.customerHistoryClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.customerHistorySubtitle}>
                            {customerOrders.length} orders · ₹{customerOrders.reduce((s, b) => s + (b.bill_total ?? 0), 0).toFixed(0)} total
                        </Text>

                        <FlatList
                            data={customerOrders}
                            keyExtractor={(item) => item.id?.toString()}
                            style={styles.customerHistoryList}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.customerHistoryItem}
                                    onPress={() => {
                                        setShowCustomerHistory(false);
                                        setSelectedCustomer(null);
                                        navigation.navigate('BillDetail', { billId: item.id });
                                    }}
                                >
                                    <View>
                                        <Text style={styles.customerHistoryDate}>
                                            {new Date(item.bill_date).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </Text>
                                        <Text style={styles.customerHistoryBillNo}>{item.bill_number}</Text>
                                    </View>
                                    <Text style={styles.customerHistoryAmount}>₹{item.bill_total.toFixed(0)}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
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

    // Tabs
    tabContainer: {
        paddingHorizontal: layout.screenPadding,
        marginBottom: spacing.md,
    },
    tabBackground: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.round,
        padding: spacing.xxs,
        position: 'relative',
        ...shadows.sm,
    },
    tabIndicator: {
        position: 'absolute',
        width: 85,
        top: spacing.xxs,
        bottom: spacing.xxs,
        left: spacing.xxs,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.round,
    },
    tab: {
        width: 85,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.xxs,
    },
    tabText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tabCount: {
        ...typography.micro,
        color: colors.textMuted,
    },
    tabCountActive: {
        color: 'rgba(255,255,255,0.8)',
    },

    // List
    listContainer: {
        paddingHorizontal: layout.screenPadding,
        paddingBottom: spacing.xxl,
    },

    // Date Group
    dateGroup: {
        marginBottom: spacing.lg,
    },
    dateDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    dateLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.borderLight,
    },
    dateText: {
        ...typography.micro,
        color: colors.textMuted,
        paddingHorizontal: spacing.md,
    },

    // Bill Card
    billCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    billHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    billInfo: {
        flex: 1,
    },
    customerName: {
        ...typography.bodyBold,
        color: colors.text,
        marginBottom: spacing.xxs,
    },
    billMeta: {
        ...typography.caption,
        color: colors.textMuted,
    },
    billAmount: {
        ...typography.h2,
        color: colors.text,
    },

    // STATUS BUTTONS - HUGE & CLEAR
    statusButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    statusBtn: {
        flex: 1,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        ...shadows.sm,
    },
    statusBtnPending: {
        backgroundColor: colors.warningLight,
        borderColor: colors.warning,
    },
    statusBtnDone: {
        backgroundColor: colors.successLight,
        borderColor: colors.success,
    },
    statusLabel: {
        fontSize: 18,
        fontWeight: '800', // Extra bold
        color: colors.text,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusLabelDone: {
        color: colors.success,
    },

    // Empty
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    emptyText: {
        ...typography.caption,
        color: colors.textMuted,
    },

    // Payment Mode Modal
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    paymentModalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
    },
    paymentModalTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    paymentModalSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    paymentModeButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    paymentModeBtn: {
        flex: 1,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        ...shadows.md,
    },
    paymentModeIcon: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    paymentModeText: {
        ...typography.h3,
        color: '#FFFFFF',
        marginBottom: spacing.xxs,
    },
    paymentModeSubtext: {
        ...typography.micro,
        color: 'rgba(255,255,255,0.8)',
    },
    paymentModalCancel: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
    },
    paymentModalCancelText: {
        ...typography.body,
        color: colors.textMuted,
    },

    // Search bar
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: layout.screenPadding,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        ...shadows.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.sm,
        fontSize: 16,
        color: colors.text,
    },
    searchClear: {
        padding: spacing.xs,
    },
    searchClearText: {
        fontSize: 16,
        color: colors.textMuted,
    },

    // Customer name tappable
    customerNameTappable: {
        textDecorationLine: 'underline',
        textDecorationStyle: 'dotted',
    },

    // Customer history modal
    customerHistoryContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        padding: layout.screenPadding,
        maxHeight: '70%',
    },
    customerHistoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    customerHistoryTitle: {
        ...typography.h2,
        color: colors.text,
    },
    customerHistoryClose: {
        fontSize: 24,
        color: colors.textMuted,
        padding: spacing.xs,
    },
    customerHistorySubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    customerHistoryList: {
        maxHeight: 300,
    },
    customerHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    customerHistoryDate: {
        ...typography.bodyBold,
        color: colors.text,
    },
    customerHistoryBillNo: {
        ...typography.caption,
        color: colors.textMuted,
    },
    customerHistoryAmount: {
        ...typography.h3,
        color: colors.primary,
    },
});

export default BillsHistoryScreen;
