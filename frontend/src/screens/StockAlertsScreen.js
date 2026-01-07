import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Input from '../components/Input';
import Button from '../components/Button';
import { EmptyStockAlerts } from '../components/EmptyState';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../config/theme';
import { getLowStockAlerts, getInventory, updateInventory } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { lightHaptic, successHaptic } from '../utils/haptics';

const StockAlertsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [allInventory, setAllInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newStock, setNewStock] = useState('');

    const loadData = async () => {
        try {
            const [alertsData, inventoryData] = await Promise.all([
                getLowStockAlerts(),
                getInventory(),
            ]);
            setAlerts(alertsData);
            setAllInventory(inventoryData);
        } catch (error) {
            console.error('Error loading stock data:', error);
            Toast.show({ type: 'error', text1: 'Failed to load stock data' });
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

    const handleUpdateStock = (item) => {
        lightHaptic();
        setSelectedItem(item);
        setNewStock(item.current_stock.toString());
        setShowUpdateModal(true);
    };

    const saveStockUpdate = async () => {
        if (!selectedItem) return;

        const stock = parseFloat(newStock);
        if (isNaN(stock) || stock < 0) {
            Toast.show({ type: 'warning', text1: 'Invalid stock value' });
            return;
        }

        try {
            await updateInventory(selectedItem.product_id, {
                current_stock: stock,
                updated_by: user.username,
            });

            successHaptic();
            Toast.show({ type: 'success', text1: 'Stock Updated' });
            setShowUpdateModal(false);
            setSelectedItem(null);
            loadData();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Update Failed' });
        }
    };

    // Categorize by priority
    const criticalItems = alerts.filter(a => a.current_stock <= a.min_stock_alert * 0.3);
    const lowItems = alerts.filter(a => a.current_stock > a.min_stock_alert * 0.3);
    const okItems = allInventory.filter(i => !alerts.find(a => a.product_id === i.product_id));

    // Stock Card with progress bar
    const StockCard = ({ item, priority }) => {
        const scaleAnim = useRef(new Animated.Value(1)).current;
        const percentage = Math.min((item.current_stock / item.min_stock_alert) * 100, 100);

        const progressColor = priority === 'critical' ? colors.error :
            priority === 'low' ? colors.warning : colors.success;

        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[
                        styles.stockCard,
                        priority === 'critical' && styles.stockCardCritical,
                    ]}
                    onPress={() => handleUpdateStock(item)}
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
                    <View style={styles.stockCardHeader}>
                        <Text style={styles.stockName}>{item.product_name}</Text>
                        {priority === 'critical' && (
                            <View style={styles.criticalBadge}>
                                <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${percentage}%`, backgroundColor: progressColor }
                                ]}
                            />
                        </View>
                        <Text style={styles.stockCount}>
                            {item.current_stock}/{item.min_stock_alert} {item.unit}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.restockButton}
                        onPress={() => handleUpdateStock(item)}
                    >
                        <Text style={styles.restockText}>+ Restock</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const SectionHeader = ({ title, count, icon }) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>{icon}</Text>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <Text style={styles.sectionCount}>{count}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Stock</Text>
                <Text style={styles.headerSubtitle}>
                    {alerts.length > 0
                        ? `${alerts.length} items need attention`
                        : 'All stock levels OK'}
                </Text>
            </View>

            {/* Summary Banner */}
            {alerts.length > 0 ? (
                <View style={styles.summaryBanner}>
                    <View style={styles.summaryIcon}>
                        <Text style={{ fontSize: 24 }}>⚠️</Text>
                    </View>
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryTitle}>
                            {criticalItems.length > 0
                                ? `${criticalItems.length} critical, ${lowItems.length} low`
                                : `${lowItems.length} items running low`}
                        </Text>
                        <Text style={styles.summaryText}>Tap an item to restock</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.successBanner}>
                    <View style={styles.successIcon}>
                        <Text style={{ fontSize: 24 }}>✅</Text>
                    </View>
                    <View>
                        <Text style={styles.successTitle}>All Stock Levels Good</Text>
                        <Text style={styles.successText}>No items need restocking</Text>
                    </View>
                </View>
            )}

            <FlatList
                data={[
                    { type: 'section', key: 'critical', title: 'Critical', count: criticalItems.length, icon: '🔴', items: criticalItems, priority: 'critical' },
                    { type: 'section', key: 'low', title: 'Low Stock', count: lowItems.length, icon: '🟡', items: lowItems, priority: 'low' },
                    { type: 'section', key: 'ok', title: 'Adequate Stock', count: okItems.length, icon: '🟢', items: okItems, priority: 'ok' },
                ].filter(s => s.items.length > 0)}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item: section }) => (
                    <View style={styles.section}>
                        <SectionHeader
                            title={section.title}
                            count={section.count}
                            icon={section.icon}
                        />
                        {section.items.map((item) => (
                            <StockCard
                                key={item.product_id || item.id}
                                item={item}
                                priority={section.priority}
                            />
                        ))}
                    </View>
                )}
                ListEmptyComponent={<EmptyStockAlerts />}
            />

            {/* Update Modal */}
            <Modal visible={showUpdateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Restock Item</Text>
                        {selectedItem && (
                            <>
                                <Text style={styles.modalSubtitle}>{selectedItem.product_name}</Text>
                                <Input
                                    label={`New Stock (${selectedItem.unit})`}
                                    value={newStock}
                                    onChangeText={setNewStock}
                                    placeholder="Enter quantity"
                                    keyboardType="decimal-pad"
                                />
                            </>
                        )}

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => {
                                    setShowUpdateModal(false);
                                    setSelectedItem(null);
                                }}
                                variant="outline"
                                style={{ flex: 1, marginRight: spacing.sm }}
                            />
                            <Button
                                title="Save"
                                onPress={saveStockUpdate}
                                style={{ flex: 1 }}
                            />
                        </View>
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

    // Summary Banners
    summaryBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warningLight,
        marginHorizontal: layout.screenPadding,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
    },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    summaryContent: {
        flex: 1,
    },
    summaryTitle: {
        ...typography.bodyBold,
        color: colors.text,
    },
    summaryText: {
        ...typography.caption,
        color: colors.textMuted,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.successLight,
        marginHorizontal: layout.screenPadding,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
    },
    successIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    successTitle: {
        ...typography.bodyBold,
        color: colors.text,
    },
    successText: {
        ...typography.caption,
        color: colors.textMuted,
    },

    // List
    listContainer: {
        paddingHorizontal: layout.screenPadding,
        paddingBottom: spacing.xxl,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    sectionIcon: {
        fontSize: 14,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
    },
    sectionCount: {
        ...typography.caption,
        color: colors.textMuted,
    },

    // Stock Card
    stockCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    stockCardCritical: {
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    stockCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    stockName: {
        ...typography.bodyBold,
        color: colors.text,
        flex: 1,
    },
    criticalBadge: {
        backgroundColor: colors.errorLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    criticalBadgeText: {
        ...typography.micro,
        color: colors.error,
    },
    progressContainer: {
        marginBottom: spacing.sm,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.lightPink,
        borderRadius: borderRadius.round,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.round,
    },
    stockCount: {
        ...typography.caption,
        color: colors.textMuted,
    },
    restockButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.round,
    },
    restockText: {
        ...typography.caption,
        color: '#FFFFFF',
        fontWeight: '600',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        padding: layout.screenPadding,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
        ...shadows.xl,
    },
    modalTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.lg,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: spacing.lg,
    },
});

export default StockAlertsScreen;
