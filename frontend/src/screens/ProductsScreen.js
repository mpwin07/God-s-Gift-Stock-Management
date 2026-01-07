import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Text,
    Modal,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { EmptyProducts } from '../components/EmptyState';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../config/theme';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/endpoints';
import { lightHaptic, successHaptic, mediumHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_GAP = spacing.sm;
const CARD_WIDTH = (width - layout.screenPadding * 2 - CARD_GAP) / 2;

const CATEGORY_EMOJI = {
    'Soap': '🧼',
    'Food': '🍎',
    'Shampoo': '🧴',
    'Other': '📦',
};

const ProductsScreen = ({ navigation }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [formData, setFormData] = useState({
        name: '',
        category: 'Soap',
        unit: 'pcs',
        rate: '',
        min_stock_alert: '10',
    });

    const loadProducts = async () => {
        try {
            const data = await getProducts({ is_active: true });
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
            Toast.show({ type: 'error', text1: 'Failed to load products' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { loadProducts(); }, []));

    const onRefresh = () => {
        setRefreshing(true);
        loadProducts();
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category,
            unit: product.unit,
            rate: product.rate?.toString() || '',
            min_stock_alert: product.min_stock_alert?.toString() || '10',
        });
        setModalVisible(true);
    };

    const handleDelete = (product) => {
        Alert.alert(
            'Delete Product',
            `Are you sure you want to delete "${product.name}"?\n\nThis cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteProduct(product._id);
                            successHaptic();
                            Toast.show({ type: 'success', text1: 'Product Deleted' });
                            loadProducts();
                        } catch (error) {
                            Toast.show({ type: 'error', text1: 'Delete Failed' });
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!formData.name) {
            Toast.show({ type: 'warning', text1: 'Name Required' });
            return;
        }

        try {
            const productData = {
                name: formData.name,
                category: formData.category,
                unit: formData.unit,
                rate: formData.rate ? parseFloat(formData.rate) : null,
                min_stock_alert: parseInt(formData.min_stock_alert) || 10,
            };

            if (editingProduct) {
                await updateProduct(editingProduct._id, productData);
                Toast.show({ type: 'success', text1: 'Product Updated' });
            } else {
                await createProduct(productData);
                successHaptic();
                Toast.show({ type: 'success', text1: 'Product Created' });
            }

            setModalVisible(false);
            setEditingProduct(null);
            setFormData({ name: '', category: 'Soap', unit: 'pcs', rate: '', min_stock_alert: '10' });
            loadProducts();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Save Failed' });
        }
    };

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category === selectedCategory);

    const categories = ['all', ...new Set(products.map(p => p.category))];

    // Product Grid Card
    const ProductGridCard = ({ item, index }) => {
        const scaleAnim = useRef(new Animated.Value(1)).current;
        const opacityAnim = useRef(new Animated.Value(0)).current;
        const translateY = useRef(new Animated.Value(30)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    delay: index * 50,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 60,
                    delay: index * 50,
                    useNativeDriver: true,
                }),
            ]).start();
        }, []);

        const handlePressIn = () => {
            lightHaptic();
            Animated.spring(scaleAnim, {
                toValue: 0.95,
                friction: 8,
                useNativeDriver: true,
            }).start();
        };

        const handlePressOut = () => {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }).start();
        };

        const emoji = CATEGORY_EMOJI[item.category] || '📦';

        return (
            <Animated.View style={[
                styles.gridCard,
                {
                    opacity: opacityAnim,
                    transform: [
                        { translateY },
                        { scale: scaleAnim }
                    ],
                }
            ]}>
                <TouchableOpacity
                    style={styles.gridCardInner}
                    onPress={() => handleEdit(item)}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onLongPress={() => handleDelete(item)}
                    activeOpacity={1}
                >
                    {/* Emoji Icon */}
                    <View style={styles.gridIconWrap}>
                        <Text style={styles.gridIcon}>{emoji}</Text>
                    </View>

                    {/* Info */}
                    <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.gridCategory}>{item.category}</Text>

                    {/* Price */}
                    {item.rate ? (
                        <Text style={styles.gridPrice}>₹{item.rate.toFixed(0)}</Text>
                    ) : (
                        <Text style={styles.gridNoPrice}>No rate</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Products</Text>
                    <Text style={styles.headerSubtitle}>{products.length} items</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
                <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                selectedCategory === item && styles.filterChipActive
                            ]}
                            onPress={() => {
                                lightHaptic();
                                setSelectedCategory(item);
                            }}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedCategory === item && styles.filterTextActive
                            ]}>
                                {item === 'all' ? 'All' : item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Product Grid */}
            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item._id}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item, index }) => (
                    <ProductGridCard item={item} index={index} />
                )}
                ListEmptyComponent={
                    <EmptyProducts onAdd={() => setModalVisible(true)} />
                }
            />

            {/* Add/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingProduct ? 'Edit Product' : 'Add Product'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setModalVisible(false);
                                setEditingProduct(null);
                            }}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Input
                            label="Product Name"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter product name"
                        />

                        <Text style={styles.fieldLabel}>Product Type</Text>
                        <View style={styles.categoryPicker}>
                            {['Soap', 'Food'].map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryOption,
                                        formData.category === cat && styles.categoryOptionActive
                                    ]}
                                    onPress={() => {
                                        lightHaptic();
                                        setFormData({
                                            ...formData,
                                            category: cat,
                                            unit: cat === 'Soap' ? 'pcs' : 'gms'
                                        });
                                    }}
                                >
                                    <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[cat]}</Text>
                                    <View>
                                        <Text style={[
                                            styles.categoryText,
                                            formData.category === cat && styles.categoryTextActive
                                        ]}>{cat}</Text>
                                        <Text style={styles.categorySubtext}>
                                            {cat === 'Soap' ? 'PCS' : 'GMS'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input
                            label="Rate (₹)"
                            value={formData.rate}
                            onChangeText={(text) => setFormData({ ...formData, rate: text })}
                            placeholder="Optional"
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            {editingProduct && (
                                <Button
                                    title="🗑️ Delete"
                                    variant="danger"
                                    onPress={() => {
                                        setModalVisible(false);
                                        handleDelete(editingProduct);
                                    }}
                                    style={{ flex: 1, marginRight: spacing.sm }}
                                />
                            )}
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => {
                                    setModalVisible(false);
                                    setEditingProduct(null);
                                }}
                                style={{ flex: 1, marginRight: spacing.sm }}
                            />
                            <Button
                                title={editingProduct ? 'Save' : 'Add'}
                                onPress={handleSave}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    addButtonText: {
        fontSize: 28,
        color: '#FFFFFF',
        fontWeight: '300',
        marginTop: -2,
    },

    // Filter
    filterSection: {
        paddingBottom: spacing.md,
    },
    filterList: {
        paddingHorizontal: layout.screenPadding,
        gap: spacing.xs,
    },
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.round,
        marginRight: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: '#FFFFFF',
    },

    // Grid
    gridContainer: {
        padding: layout.screenPadding,
        paddingTop: 0,
    },
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: CARD_GAP,
    },
    gridCard: {
        width: CARD_WIDTH,
    },
    gridCardInner: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    gridIconWrap: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.lightPink,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    gridIcon: {
        fontSize: 32,
    },
    gridName: {
        ...typography.bodyBold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.xxs,
    },
    gridCategory: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    gridPrice: {
        ...typography.h3,
        color: colors.primary,
    },
    gridNoPrice: {
        ...typography.caption,
        color: colors.textMuted,
        fontStyle: 'italic',
    },

    // Modal
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
        maxHeight: '80%',
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
    fieldLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    categoryPicker: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    categoryOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.border,
    },
    categoryOptionActive: {
        backgroundColor: colors.lightPink,
        borderColor: colors.primary,
    },
    categoryEmoji: {
        fontSize: 20,
    },
    categoryText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    categoryTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    categorySubtext: {
        ...typography.micro,
        color: colors.textMuted,
        marginTop: -2,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: spacing.lg,
    },
});

export default ProductsScreen;
