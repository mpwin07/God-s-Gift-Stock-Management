import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-toast-message';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import BillItem from '../components/BillItem';
import SuccessConfetti from '../components/SuccessConfetti';
import { colors, spacing, fontSize, borderRadius } from '../config/theme';
import { getProducts, createBill, getBills } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { successHaptic, mediumHaptic, warningHaptic } from '../utils/haptics';

const NewBillScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const confettiRef = useRef(null);
    const duplicateData = route?.params?.duplicateData;

    const [products, setProducts] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const [batchNumber, setBatchNumber] = useState('');
    const [billDate, setBillDate] = useState(null); // Optional manual date
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [items, setItems] = useState([]);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // For adding item with custom rate
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showRateModal, setShowRateModal] = useState(false);
    const [itemRate, setItemRate] = useState('');
    const [itemQuantity, setItemQuantity] = useState('1');

    // Search and filter
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Food', 'Soap'

    // Item entry fields
    const [itemGrams, setItemGrams] = useState('');

    useEffect(() => {
        loadProducts();
        loadRecentCustomers();
    }, []);

    // Pre-fill form when duplicating a bill
    useEffect(() => {
        if (duplicateData) {
            setCustomerName(duplicateData.customer_name || '');
            setCustomerPhone(duplicateData.customer_phone || '');
            setItems(duplicateData.items || []);
        }
    }, [duplicateData]);

    const loadProducts = async () => {
        try {
            const data = await getProducts({ is_active: true });
            setProducts(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load products');
        }
    };

    const loadRecentCustomers = async () => {
        try {
            const bills = await getBills({ limit: 200 });
            // Extract unique customers with their most recent phone numbers
            const customersMap = new Map();
            bills.forEach(bill => {
                if (bill.customer_name) {
                    customersMap.set(bill.customer_name, {
                        name: bill.customer_name,
                        phone: bill.customer_phone || '',
                    });
                }
            });
            setRecentCustomers(Array.from(customersMap.values()));
        } catch (error) {
            // Silently fail - autocomplete is not critical
            console.log('Failed to load customers:', error);
        }
    };

    // Filter customer suggestions as user types
    useEffect(() => {
        if (customerName.trim().length >= 2) {
            const filtered = recentCustomers.filter(customer =>
                customer.name.toLowerCase().includes(customerName.toLowerCase())
            );
            setCustomerSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [customerName, recentCustomers]);

    const selectCustomer = (customer) => {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
        setShowSuggestions(false);
    };

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let filtered = [...products];

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(p => p.category === categoryFilter);
        }

        // Sort: Food first, then Soap
        filtered.sort((a, b) => {
            if (a.category === 'Food' && b.category !== 'Food') return -1;
            if (a.category !== 'Food' && b.category === 'Food') return 1;
            return a.name.localeCompare(b.name);
        });

        return filtered;
    }, [products, searchQuery, categoryFilter]);

    // When user selects a product, show rate input modal
    const selectProduct = (product) => {
        setSelectedProduct(product);
        setItemRate(product.rate ? product.rate.toString() : '');
        setItemGrams('');
        setItemQuantity('1');
        setShowProductPicker(false);
        setShowRateModal(true);
    };

    // Add item with manually entered rate OR auto-calculated from grams
    // CLEAN WEIGHT CALCULATION - explicit Number() conversion
    const confirmAddItem = () => {
        const grams = Number(itemGrams) || 0;
        const qty = Number(itemQuantity) || 0;
        const baseWeight = Number(selectedProduct.base_weight) || 250;
        const productRate = Number(selectedProduct.rate) || 0;

        // Calculate rate: either use entered rate, or calculate from grams
        let rate = 0;
        const customRateStr = itemRate.trim();
        const customRate = Number(customRateStr);

        if (customRateStr && customRate > 0) {
            // User manually entered a rate
            rate = customRate;
        } else if (grams > 0 && productRate > 0) {
            // Calculate from grams: (grams / baseWeight) * productRate
            rate = Math.round((grams / baseWeight) * productRate * 100) / 100;
        } else {
            // Use product's default rate
            rate = productRate;
        }

        if (!rate || rate <= 0) {
            Alert.alert('Error', 'Please enter grams or a custom rate');
            return;
        }

        if (!qty || qty <= 0) {
            Alert.alert('Error', 'Please enter a valid quantity (must be greater than 0)');
            return;
        }

        // Use proper rounding to avoid floating point issues
        const itemTotal = Math.round(rate * qty * 100) / 100;

        const newItem = {
            product_id: selectedProduct._id,
            product_name: selectedProduct.name,
            grams: grams,
            quantity: qty,
            unit: grams > 0 ? 'grams' : selectedProduct.unit,
            rate: rate,
            item_total: itemTotal,
        };

        setItems([...items, newItem]);
        setShowRateModal(false);
        setSelectedProduct(null);
        setItemRate('');
        setItemGrams('');
        setItemQuantity('1');
    };

    const updateItemQuantity = (index, quantity) => {
        const newItems = [...items];
        const qty = parseFloat(quantity) || 0;
        newItems[index].quantity = qty;
        newItems[index].item_total = Math.round(qty * newItems[index].rate * 100) / 100;
        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        const total = items.reduce((sum, item) => sum + item.item_total, 0);
        return Math.round(total * 100) / 100;
    };

    const handleCreateBill = async () => {
        if (!customerName) {
            Toast.show({
                type: 'warning',
                text1: 'Customer Name Required',
                text2: 'Please enter the customer name',
            });
            return;
        }

        if (items.length === 0) {
            Toast.show({
                type: 'warning',
                text1: 'No Items Added',
                text2: 'Add at least one item to create a bill',
            });
            return;
        }

        setLoading(true);
        try {
            const billData = {
                customer_name: customerName,
                customer_phone: customerPhone || null,
                batch_number: batchNumber || null,
                items: items,
                bill_total: calculateTotal(),
                order_source: 'offline',
                created_by: user.username,
            };

            // Add optional bill date for backdating orders
            if (billDate) {
                // Set to noon IST to avoid timezone issues
                const d = new Date(billDate);
                d.setHours(12, 0, 0, 0);
                billData.bill_date = d.toISOString();
            }

            await createBill(billData);

            // Success celebration!
            successHaptic();
            confettiRef.current?.fire();

            Toast.show({
                type: 'success',
                text1: '🎉 Bill Created!',
                text2: `₹${calculateTotal().toFixed(2)} for ${customerName}`,
                visibilityTime: 3000,
            });

            // Navigate back after confetti
            setTimeout(() => navigation.goBack(), 1500);
        } catch (error) {
            // Error haptic
            warningHaptic();

            Toast.show({
                type: 'error',
                text1: 'Bill Creation Failed',
                text2: error.response?.data?.detail || 'Please try again',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Header
                title="New Bill"
                onBackPress={() => navigation.goBack()}
            />

            {/* ZONE 1: Fixed Customer Details - Never scrolls */}
            <View style={styles.customerSection}>
                <Card>
                    <View>
                        <Input
                            label="Customer Name *"
                            value={customerName}
                            onChangeText={setCustomerName}
                            placeholder="Enter customer name"
                            onFocus={() => customerName.length >= 2 && setShowSuggestions(true)}
                        />
                        {showSuggestions && customerSuggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <ScrollView
                                    style={styles.suggestionsList}
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled
                                >
                                    {customerSuggestions.map((customer, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.suggestionItem}
                                            onPress={() => selectCustomer(customer)}
                                        >
                                            <Text style={styles.suggestionName}>{customer.name}</Text>
                                            {customer.phone && (
                                                <Text style={styles.suggestionPhone}>{customer.phone}</Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                    <Input
                        label="Customer Phone"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                    />
                    <Input
                        label="Batch Number"
                        value={batchNumber}
                        onChangeText={setBatchNumber}
                        placeholder="Enter batch number (optional)"
                    />

                    {/* Date Picker - Calendar */}
                    <Text style={styles.dateLabel}>Bill Date (Optional - for past orders)</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={billDate ? styles.dateText : styles.datePlaceholder}>
                            {billDate
                                ? `📅 ${billDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`
                                : '📅 Tap to select date (default: today)'
                            }
                        </Text>
                        {billDate && (
                            <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); setBillDate(null); }}
                                style={styles.clearDateBtn}
                            >
                                <Text style={styles.clearDateText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                    <DateTimePickerModal
                        isVisible={showDatePicker}
                        mode="date"
                        onConfirm={(date) => {
                            setBillDate(date);
                            setShowDatePicker(false);
                        }}
                        onCancel={() => setShowDatePicker(false)}
                        maximumDate={new Date()}
                        date={billDate || new Date()}
                    />
                </Card>
            </View>

            {/* ZONE 2: Scrollable Items ONLY */}
            <View style={styles.itemsContainer}>
                <View style={styles.itemsHeader}>
                    <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                    <Button
                        title="+ Add Item"
                        onPress={() => setShowProductPicker(true)}
                        size="sm"
                    />
                </View>

                <ScrollView
                    style={styles.itemsScroll}
                    contentContainerStyle={styles.itemsScrollContent}
                    showsVerticalScrollIndicator={true}
                >
                    {items.map((item, index) => (
                        <View key={index} style={styles.itemContainer}>
                            <BillItem item={item} index={index} />
                            <View style={styles.itemActions}>
                                <Input
                                    label="Quantity"
                                    value={item.quantity.toString()}
                                    onChangeText={(text) => updateItemQuantity(index, text)}
                                    keyboardType="decimal-pad"
                                    style={styles.quantityInput}
                                />
                                <TouchableOpacity
                                    onPress={() => removeItem(index)}
                                    style={styles.removeButton}
                                >
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {items.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No items added yet</Text>
                            <Text style={styles.emptySubtext}>Tap "+ Add Item" to get started</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* ZONE 3: Fixed Footer - Always visible */}
            <View style={styles.footer}>
                <View style={styles.footerContent}>
                    <View style={styles.footerTotal}>
                        <Text style={styles.footerTotalLabel}>Total</Text>
                        <Text style={styles.footerTotalValue}>₹{calculateTotal().toFixed(2)}</Text>
                    </View>
                    <Button
                        title="Create Bill"
                        onPress={handleCreateBill}
                        loading={loading}
                        disabled={items.length === 0}
                        style={styles.createButton}
                    />
                </View>
            </View>

            <Modal visible={showProductPicker} animationType="slide">
                <View style={styles.modalContainer}>
                    <Header
                        title="Select Product"
                        onBackPress={() => {
                            setShowProductPicker(false);
                            setSearchQuery('');
                            setCategoryFilter('all');
                        }}
                    />

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="🔍 Search products..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Category Filters */}
                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={[styles.filterBtn, categoryFilter === 'all' && styles.filterBtnActive]}
                            onPress={() => setCategoryFilter('all')}
                        >
                            <Text style={[styles.filterBtnText, categoryFilter === 'all' && styles.filterBtnTextActive]}>
                                📦 All
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterBtn, categoryFilter === 'Food' && styles.filterBtnActive]}
                            onPress={() => setCategoryFilter('Food')}
                        >
                            <Text style={[styles.filterBtnText, categoryFilter === 'Food' && styles.filterBtnTextActive]}>
                                🍎 Food
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterBtn, categoryFilter === 'Soap' && styles.filterBtnActive]}
                            onPress={() => setCategoryFilter('Soap')}
                        >
                            <Text style={[styles.filterBtnText, categoryFilter === 'Soap' && styles.filterBtnTextActive]}>
                                🧼 Soaps
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Results count */}
                    <Text style={styles.resultsCount}>
                        {filteredProducts.length} products found
                    </Text>

                    <FlatList
                        data={filteredProducts}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.productItem}
                                onPress={() => selectProduct(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.productItemLeft}>
                                    <Text style={styles.productEmoji}>
                                        {item.category === 'Food' ? '🍎' : '🧼'}
                                    </Text>
                                    <View>
                                        <Text style={styles.productName}>{item.name}</Text>
                                        <Text style={styles.productUnit}>(grams)</Text>
                                    </View>
                                </View>
                                <View style={styles.productItemRight}>
                                    <Text style={[styles.productCategory,
                                    item.category === 'Food' ? styles.foodCategory : styles.soapCategory
                                    ]}>
                                        {item.category}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyProductsContainer}>
                                <Text style={styles.emptyProductsTitle}>No Products Found</Text>
                                <Text style={styles.emptyProductsText}>
                                    {searchQuery ? 'Try a different search term' : 'Please add products first.'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </Modal>

            {/* Rate Entry Modal */}
            <Modal visible={showRateModal} animationType="slide" transparent>
                <View style={styles.rateModalOverlay}>
                    <View style={styles.rateModalContent}>
                        <Text style={styles.rateModalTitle}>
                            {selectedProduct?.name}
                        </Text>
                        <Text style={styles.rateModalSubtitle}>
                            {selectedProduct?.rate ? `₹${selectedProduct.rate} for ${selectedProduct.base_weight || 250}g` : 'Enter rate'}
                        </Text>

                        <Input
                            label="Weight (grams) ⚖️"
                            value={itemGrams}
                            onChangeText={setItemGrams}
                            placeholder={`e.g. 100, 250, 500`}
                            keyboardType="decimal-pad"
                        />

                        <Input
                            label="Custom Rate (₹) - optional"
                            value={itemRate}
                            onChangeText={setItemRate}
                            placeholder="Leave blank for auto-calculate"
                            keyboardType="decimal-pad"
                        />

                        <Input
                            label="Quantity"
                            value={itemQuantity}
                            onChangeText={setItemQuantity}
                            placeholder="1"
                            keyboardType="decimal-pad"
                        />

                        {/* Price Preview - auto-calculated */}
                        <View style={styles.pricePreview}>
                            <Text style={styles.pricePreviewLabel}>Calculated Price:</Text>
                            <Text style={styles.pricePreviewValue}>
                                ₹{(() => {
                                    const grams = Number(itemGrams) || 0;
                                    const qty = Number(itemQuantity) || 1;
                                    const baseWeight = Number(selectedProduct?.base_weight) || 250;
                                    const productRate = Number(selectedProduct?.rate) || 0;
                                    const customRateStr = itemRate.trim();
                                    const customRate = Number(customRateStr);

                                    if (customRateStr && customRate > 0) {
                                        return Math.round(customRate * qty);
                                    } else if (grams > 0 && productRate > 0) {
                                        const calcRate = (grams / baseWeight) * productRate;
                                        return Math.round(calcRate * qty);
                                    }
                                    return '0';
                                })()}
                            </Text>
                        </View>

                        <View style={styles.rateModalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => {
                                    setShowRateModal(false);
                                    setSelectedProduct(null);
                                }}
                                variant="outline"
                                style={styles.rateModalButton}
                            />
                            <Button
                                title="Add Item"
                                onPress={confirmAddItem}
                                style={styles.rateModalButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Confetti celebration on bill success */}
            <SuccessConfetti ref={confettiRef} />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    // MAIN CONTAINER - simple flex layout
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Customer details section
    customerSection: {
        padding: spacing.md,
        paddingBottom: 0,
        backgroundColor: colors.background,
    },

    // Items container - takes remaining space
    itemsContainer: {
        flex: 1,
        minHeight: 100,
    },
    itemsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background,
    },
    itemsScroll: {
        flex: 1,
    },
    itemsScrollContent: {
        padding: spacing.md,
        paddingTop: 0,
        paddingBottom: 140, // Space for footer + navigation buttons
    },

    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    itemContainer: {
        marginBottom: spacing.md,
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    quantityInput: {
        flex: 1,
    },
    removeButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    removeText: {
        color: '#D32F2F',
        fontWeight: '500',
        fontSize: fontSize.sm,
    },

    // Empty state styles
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    emptySubtext: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: fontSize.sm,
        marginTop: spacing.xs,
    },

    createButton: {
        paddingHorizontal: spacing.lg,
        minWidth: 130,
    },

    // ZONE 3: Footer - fixed at bottom
    footer: {
        flexShrink: 0,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        paddingBottom: 24, // Extra padding for devices with navigation buttons
    },
    footerTotal: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    footerTotalLabel: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    footerTotalValue: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.primary,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: 8,
    },
    productName: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    productRate: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.primary,
    },
    emptyProductsContainer: {
        padding: spacing.xxl,
        alignItems: 'center',
    },
    emptyProductsTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyProductsText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    productUnit: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    productCategory: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    foodCategory: {
        backgroundColor: '#E8F5E9',
        color: '#2E7D32',
    },
    soapCategory: {
        backgroundColor: '#E3F2FD',
        color: '#1565C0',
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
    },
    searchInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        backgroundColor: colors.surface,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterBtnText: {
        fontSize: fontSize.sm,
        color: colors.text,
    },
    filterBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    resultsCount: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
    },
    productItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    productEmoji: {
        fontSize: 28,
        marginRight: spacing.sm,
    },
    productItemRight: {
        alignItems: 'flex-end',
    },
    rateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    rateModalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.lg,
    },
    rateModalTitle: {
        fontSize: fontSize.xl,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    rateModalSubtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    rateModalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    rateModalButton: {
        flex: 1,
    },
    pricePreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.lightPink,
        padding: spacing.md,
        borderRadius: 12,
        marginTop: spacing.sm,
    },
    pricePreviewLabel: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    pricePreviewValue: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.primary,
    },

    // Date picker styles
    dateLabel: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    datePickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateText: {
        fontSize: fontSize.md,
        color: colors.text,
        fontWeight: '500',
    },
    datePlaceholder: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    clearDateBtn: {
        padding: spacing.xs,
        backgroundColor: colors.lightPink,
        borderRadius: borderRadius.sm,
    },
    clearDateText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: '600',
    },

    // Customer autocomplete styles
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderTopWidth: 0,
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    suggestionsList: {
        maxHeight: 200,
    },
    suggestionItem: {
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    suggestionPhone: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
});

export default NewBillScreen;
