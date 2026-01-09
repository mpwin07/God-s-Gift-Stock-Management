import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-toast-message';
import Header from '../components/Header';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { colors, spacing, fontSize, borderRadius, shadows, typography, layout } from '../config/theme';
import { getExpenses, createExpense, deleteExpense, getExpenseMonthlyTotals } from '../api/endpoints';
import { lightHaptic, successHaptic, mediumHaptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

const ExpensesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [monthlyTotals, setMonthlyTotals] = useState({ this_month_expenses: 0, last_month_expenses: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        quantity_gms: '',
        expense_date: null,
        notes: '',
    });

    const loadData = async () => {
        try {
            const [expensesData, totals] = await Promise.all([
                getExpenses({ limit: 100 }),
                getExpenseMonthlyTotals(),
            ]);
            setExpenses(expensesData);
            setMonthlyTotals(totals);
        } catch (error) {
            console.error('Error loading expenses:', error);
            Toast.show({ type: 'error', text1: 'Failed to load expenses' });
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

    const handleAddExpense = async () => {
        if (!formData.name.trim()) {
            Toast.show({ type: 'warning', text1: 'Name required' });
            return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            Toast.show({ type: 'warning', text1: 'Valid price required' });
            return;
        }
        if (!formData.quantity_gms || parseFloat(formData.quantity_gms) <= 0) {
            Toast.show({ type: 'warning', text1: 'Valid quantity required' });
            return;
        }

        try {
            const expenseData = {
                name: formData.name.trim(),
                price: parseFloat(formData.price),
                quantity_gms: parseFloat(formData.quantity_gms),
                notes: formData.notes.trim() || null,
                created_by: user?.username,
            };

            if (formData.expense_date) {
                expenseData.expense_date = formData.expense_date.toISOString();
            }

            await createExpense(expenseData);
            successHaptic();
            Toast.show({ type: 'success', text1: '✅ Expense Added!' });

            setShowAddModal(false);
            setFormData({ name: '', price: '', quantity_gms: '', expense_date: null, notes: '' });
            loadData();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Failed to add expense' });
        }
    };

    const handleDeleteExpense = async (expense) => {
        Alert.alert(
            'Delete Expense',
            `Delete "${expense.name}" (₹${expense.price})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteExpense(expense._id);
                            successHaptic();
                            Toast.show({ type: 'success', text1: 'Expense Deleted' });
                            loadData();
                        } catch (error) {
                            Toast.show({ type: 'error', text1: 'Delete Failed' });
                        }
                    },
                },
            ]
        );
    };

    // Group expenses by date
    const groupExpensesByDate = (expensesList) => {
        const groups = {};
        expensesList.forEach(expense => {
            const date = new Date(expense.expense_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(expense);
        });
        return Object.entries(groups).map(([date, items]) => ({ date, items }));
    };

    const groupedExpenses = groupExpensesByDate(expenses);

    const ExpenseCard = ({ item }) => (
        <TouchableOpacity
            style={styles.expenseCard}
            onLongPress={() => handleDeleteExpense(item)}
            activeOpacity={0.8}
        >
            <View style={styles.expenseMain}>
                <Text style={styles.expenseName}>{item.name}</Text>
                <Text style={styles.expensePrice}>₹{item.price.toFixed(0)}</Text>
            </View>
            <View style={styles.expenseDetails}>
                <Text style={styles.expenseQty}>{item.quantity_gms}g</Text>
                {item.notes && <Text style={styles.expenseNotes}>{item.notes}</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Expenses</Text>
                <Text style={styles.headerSubtitle}>Raw Materials</Text>
            </View>

            {/* Monthly Summary */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>This Month</Text>
                    <Text style={styles.summaryValue}>₹{monthlyTotals.this_month_expenses?.toFixed(0) || 0}</Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardSecondary]}>
                    <Text style={styles.summaryLabel}>Last Month</Text>
                    <Text style={styles.summaryValueSecondary}>₹{monthlyTotals.last_month_expenses?.toFixed(0) || 0}</Text>
                </View>
            </View>



            {/* Expenses List */}
            <FlatList
                data={groupedExpenses}
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
                        <Text style={styles.dateHeader}>{group.date}</Text>
                        {group.items.map((expense) => (
                            <ExpenseCard key={expense._id} item={expense} />
                        ))}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📦</Text>
                        <Text style={styles.emptyTitle}>No Expenses Yet</Text>
                        <Text style={styles.emptyText}>Tap "+ Add Expense" to track raw materials</Text>
                    </View>
                }
            />

            {/* Floating Add Button */}
            <View style={styles.fabContainer}>
                <Button
                    title="+ Add Expense"
                    onPress={() => setShowAddModal(true)}
                    style={styles.fab}
                />
            </View>

            {/* Add Expense Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Expense</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Input
                                label="Raw Material Name *"
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="e.g., Coconut Oil, Lye"
                            />

                            <Input
                                label="Price (₹) *"
                                value={formData.price}
                                onChangeText={(text) => setFormData({ ...formData, price: text })}
                                placeholder="Total amount paid"
                                keyboardType="decimal-pad"
                            />

                            <Input
                                label="Quantity (grams) *"
                                value={formData.quantity_gms}
                                onChangeText={(text) => setFormData({ ...formData, quantity_gms: text })}
                                placeholder="Weight in grams"
                                keyboardType="decimal-pad"
                            />

                            {/* Date Picker */}
                            <Text style={styles.dateLabel}>Purchase Date (optional)</Text>
                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={formData.expense_date ? styles.dateText : styles.datePlaceholder}>
                                    {formData.expense_date
                                        ? `📅 ${formData.expense_date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                        : '📅 Tap to select (default: today)'
                                    }
                                </Text>
                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={showDatePicker}
                                mode="date"
                                onConfirm={(date) => {
                                    setFormData({ ...formData, expense_date: date });
                                    setShowDatePicker(false);
                                }}
                                onCancel={() => setShowDatePicker(false)}
                                maximumDate={new Date()}
                                date={formData.expense_date || new Date()}
                            />

                            <Input
                                label="Notes (optional)"
                                value={formData.notes}
                                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                                placeholder="Any additional details"
                            />

                            <View style={styles.modalActions}>
                                <Button
                                    title="Cancel"
                                    variant="outline"
                                    onPress={() => setShowAddModal(false)}
                                    style={{ flex: 1, marginRight: spacing.sm }}
                                />
                                <Button
                                    title="Add Expense"
                                    onPress={handleAddExpense}
                                    style={{ flex: 1 }}
                                />
                            </View>
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: layout.screenPadding,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    summaryCardSecondary: {
        backgroundColor: colors.surface,
    },
    summaryLabel: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: spacing.xxs,
    },
    summaryValue: {
        ...typography.h2,
        color: '#FFFFFF',
    },
    summaryValueSecondary: {
        ...typography.h2,
        color: colors.text,
    },
    // FAB Styles
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    fab: {
        borderRadius: 28,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    listContainer: {
        paddingHorizontal: layout.screenPadding,
        paddingBottom: 100, // Extra space for FAB
    },
    dateGroup: {
        marginBottom: spacing.md,
    },
    dateHeader: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.xs,
        fontWeight: '600',
    },
    expenseCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
        ...shadows.sm,
    },
    expenseMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xxs,
    },
    expenseName: {
        ...typography.bodyBold,
        color: colors.text,
        flex: 1,
    },
    expensePrice: {
        ...typography.h3,
        color: colors.primary,
    },
    expenseDetails: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    expenseQty: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    expenseNotes: {
        ...typography.caption,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        padding: layout.screenPadding,
        paddingTop: spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        ...typography.h2,
        color: colors.text,
    },
    modalClose: {
        fontSize: 24,
        color: colors.textMuted,
        padding: spacing.xs,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: spacing.lg,
    },
    dateLabel: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    datePickerButton: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateText: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    datePlaceholder: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
});

export default ExpensesScreen;
