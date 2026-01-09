import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    TouchableOpacity,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Header from '../components/Header';
import Card from '../components/Card';
import BillItem from '../components/BillItem';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../config/theme';
import { getBillById, getPaymentByBill, updatePayment, deleteBill, deleteBillItem } from '../api/endpoints';
import Toast from 'react-native-toast-message';

const BillDetailScreen = ({ route, navigation }) => {
    const { billId } = route.params;
    const [bill, setBill] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');

    useEffect(() => {
        loadBillDetails();
    }, [billId]);

    const loadBillDetails = async () => {
        try {
            const [billData, paymentData] = await Promise.all([
                getBillById(billId),
                getPaymentByBill(billId),
            ]);
            setBill(billData);
            setPayment(paymentData);
            if (paymentData) {
                setAmountPaid(paymentData.amount_paid.toString());
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load bill details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    // Duplicate bill
    const handleDuplicateBill = () => {
        navigation.navigate('NewBill', {
            duplicateData: {
                customer_name: bill.customer_name,
                customer_phone: bill.customer_phone,
                items: bill.items.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    rate: item.rate, // Include rate
                    grams: item.grams, // Include grams
                })),
            }
        });
        Toast.show({ type: 'info', text1: 'Bill copied for new order' });
    };

    // Delete Bill
    const handleDeleteBill = () => {
        Alert.alert(
            'Delete Bill',
            'Are you sure? This will delete the bill permanently and RESTORE STOCK.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteBill(billId);
                            Toast.show({ type: 'success', text1: 'Bill Deleted', text2: 'Stock restored' });
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete bill');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Remove Item
    const handleRemoveItem = (index) => {
        Alert.alert(
            'Remove Item',
            'Remove this item? Stock will be restored.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const updatedBill = await deleteBillItem(billId, index);
                            setBill(updatedBill);

                            // Re-fetch payment details because total changed
                            const updatedPayment = await getPaymentByBill(billId);
                            setPayment(updatedPayment);

                            Toast.show({ type: 'success', text1: 'Item Removed' });
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove item');
                        }
                    }
                }
            ]
        );
    };

    const handleShareBill = async () => {
        // ... (rest of share logic stays same) ...
        try {
            const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
        h1 { text-align: center; color: #E85B75; margin-bottom: 5px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #ccc; padding-bottom: 15px; }
        .header p { margin: 5px 0; color: #666; }
        .info { margin-bottom: 15px; }
        .info p { margin: 3px 0; }
        .items { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .items th, .items td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
        .items th { background: #f5f5f5; }
        .items .qty { width: 50px; text-align: center; }
        .items .price { text-align: right; }
        .total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #E85B75; }
        .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>God's Gift</h1>
        <p>Receipt</p>
    </div>
    <div class="info">
        <p><strong>Bill:</strong> ${bill.bill_number}</p>
        <p><strong>Customer:</strong> ${bill.customer_name}</p>
        <p><strong>Date:</strong> ${new Date(bill.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
    </div>
    <table class="items">
        <tr><th>Item</th><th class="qty">Qty</th><th class="price">Amount</th></tr>
        ${bill.items.map(item => {
                const rate = item.rate ?? item.unit_price ?? 0;
                const total = item.item_total ?? (item.quantity * rate);
                return `
            <tr>
                <td>${item.product_name}</td>
                <td class="qty">${item.quantity}</td>
                <td class="price">₹${total.toFixed(0)}</td>
            </tr>
        `}).join('')}
    </table>
    <div class="total">
        <div class="total-row">
            <span>Total:</span>
            <span>₹${bill.bill_total.toFixed(0)}</span>
        </div>
    </div>
    <div class="footer">
        <p>Thank you for your purchase!</p>
    </div>
</body>
</html>
            `;

            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Bill ${bill.bill_number}`,
                });
            } else {
                Toast.show({ type: 'error', text1: 'Sharing not available' });
            }
        } catch (error) {
            console.error('Share error:', error);
            Toast.show({ type: 'error', text1: 'Share failed' });
        }
    };

    const handleUpdatePayment = async () => {
        try {
            const amount = parseFloat(amountPaid);
            if (isNaN(amount) || amount < 0) {
                Alert.alert('Error', 'Invalid amount');
                return;
            }

            await updatePayment(payment.id, {
                amount_paid: amount,
                payment_mode: 'Cash',
            });

            Alert.alert('Success', 'Payment updated successfully');
            setShowPaymentModal(false);
            const updatedPayment = await getPaymentByBill(billId);
            setPayment(updatedPayment); // Specific reload
        } catch (error) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update payment');
        }
    };

    if (loading || !bill) {
        return (
            <View style={styles.container}>
                <Header title="Bill Details" onBackPress={() => navigation.goBack()} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed':
                return colors.success;
            case 'Partial':
                return colors.warning;
            default:
                return colors.error;
        }
    };

    return (
        <View style={styles.container}>
            <Header
                title="Bill Details"
                subtitle={bill.bill_number}
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView style={styles.content}>
                <Card>
                    <Text style={styles.label}>Customer</Text>
                    <Text style={styles.value}>{bill.customer_name}</Text>
                    {bill.customer_phone && (
                        <>
                            <Text style={styles.label}>Phone</Text>
                            <Text style={styles.value}>{bill.customer_phone}</Text>
                        </>
                    )}
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>{formatDate(bill.bill_date)}</Text>
                    {bill.batch_number && (
                        <>
                            <Text style={styles.label}>Batch Number</Text>
                            <Text style={styles.value}>{bill.batch_number}</Text>
                        </>
                    )}
                </Card>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {bill.items.map((item, index) => (
                        <BillItem
                            key={index}
                            item={item}
                            index={index}
                            onRemove={() => handleRemoveItem(index)}
                        />
                    ))}
                </View>

                <Card style={styles.totalCard}>
                    <View style={styles.row}>
                        <Text style={styles.totalLabel}>Bill Total</Text>
                        <Text style={styles.totalValue}>₹{bill.bill_total.toFixed(2)}</Text>
                    </View>
                </Card>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleDuplicateBill}>
                        <Text style={styles.actionBtnIcon}>📋</Text>
                        <Text style={styles.actionBtnText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleShareBill}>
                        <Text style={styles.actionBtnIcon}>📤</Text>
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Delete Bill Button */}
                <TouchableOpacity
                    style={styles.deleteBillBtn}
                    onPress={handleDeleteBill}
                    activeOpacity={0.7}
                >
                    <Text style={styles.deleteBillText}>🗑️ Delete Bill</Text>
                </TouchableOpacity>

                {payment && (
                    <Card style={styles.paymentCard}>
                        <View style={styles.paymentHeader}>
                            <Text style={styles.sectionTitle}>Payment Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.payment_status) }]}>
                                <Text style={styles.statusText}>{payment.payment_status}</Text>
                            </View>
                        </View>

                        <View style={styles.paymentRow}>
                            <Text style={styles.label}>Amount Paid</Text>
                            <Text style={styles.value}>₹{payment.amount_paid.toFixed(2)}</Text>
                        </View>

                        <View style={styles.paymentRow}>
                            <Text style={styles.label}>Balance Due</Text>
                            <Text style={[styles.value, { color: colors.error }]}>
                                ₹{payment.balance_due.toFixed(2)}
                            </Text>
                        </View>

                        <Button
                            title="Update Payment"
                            onPress={() => setShowPaymentModal(true)}
                            style={styles.updateButton}
                        />
                    </Card>
                )}
            </ScrollView>

            <Modal visible={showPaymentModal} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Payment</Text>

                        <Input
                            label="Amount Paid"
                            value={amountPaid}
                            onChangeText={setAmountPaid}
                            placeholder="Enter amount"
                            keyboardType="decimal-pad"
                        />

                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowPaymentModal(false)}
                                variant="outline"
                                style={styles.modalButton}
                            />
                            <Button
                                title="Update"
                                onPress={handleUpdatePayment}
                                style={styles.modalButton}
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
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: spacing.xxl,
        color: colors.textSecondary,
    },
    label: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    value: {
        fontSize: fontSize.md,
        color: colors.text,
        fontWeight: '500',
    },
    section: {
        marginTop: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    totalCard: {
        marginTop: spacing.md,
        backgroundColor: colors.lightPink,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    totalValue: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.primary,
    },
    paymentCard: {
        marginTop: spacing.md,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    updateButton: {
        marginTop: spacing.md,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    modalButton: {
        flex: 1,
    },

    // Action buttons
    actionRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionBtnPrimary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    deleteBillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: '#FFEBEE',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    deleteBillText: {
        color: '#D32F2F',
        fontWeight: '600',
        fontSize: fontSize.md,
    },
    actionBtnIcon: {
        fontSize: 18,
    },
    actionBtnText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
});

export default BillDetailScreen;
