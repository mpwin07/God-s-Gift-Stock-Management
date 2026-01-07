import React, { useState, useRef, useEffect } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    ActivityIndicator,
    View,
} from 'react-native';
import { colors, spacing, fontSize } from '../config/theme';
import { lightHaptic } from '../utils/haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Button = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    style,
    icon,
    success = false,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const successAnim = useRef(new Animated.Value(0)).current;
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (success) {
            setShowSuccess(true);
            Animated.spring(successAnim, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => {
                    Animated.timing(successAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => setShowSuccess(false));
                }, 1500);
            });
        }
    }, [success]);

    const handlePressIn = () => {
        // Haptic feedback on press
        lightHaptic();

        Animated.spring(scaleAnim, {
            toValue: 0.96,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const getButtonStyle = () => {
        const baseStyle = [styles.button, styles[size]];

        switch (variant) {
            case 'outline':
                baseStyle.push(styles.outlineButton);
                break;
            case 'ghost':
                baseStyle.push(styles.ghostButton);
                break;
            case 'danger':
                baseStyle.push(styles.dangerButton);
                break;
            default:
                baseStyle.push(styles.primaryButton);
        }

        if (disabled || loading) {
            baseStyle.push(styles.disabledButton);
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        const baseStyle = [styles.text, styles[`${size}Text`]];

        switch (variant) {
            case 'outline':
            case 'ghost':
                baseStyle.push(styles.outlineText);
                break;
            case 'danger':
                baseStyle.push(styles.dangerText);
                break;
            default:
                baseStyle.push(styles.primaryText);
        }

        if (disabled) {
            baseStyle.push(styles.disabledText);
        }

        return baseStyle;
    };

    return (
        <AnimatedTouchable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={[
                ...getButtonStyle(),
                style,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
            activeOpacity={0.9}
        >
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
                        size="small"
                    />
                    <Text style={[...getTextStyle(), styles.loadingText]}>Loading...</Text>
                </View>
            ) : showSuccess ? (
                <Animated.Text
                    style={[
                        ...getTextStyle(),
                        {
                            transform: [{
                                scale: successAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 1.2, 1],
                                })
                            }],
                        },
                    ]}
                >
                    ✓ Success!
                </Animated.Text>
            ) : (
                <View style={styles.contentContainer}>
                    {icon && <Text style={styles.icon}>{icon}</Text>}
                    <Text style={getTextStyle()}>{title}</Text>
                </View>
            )}
        </AnimatedTouchable>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        elevation: 4,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
        shadowOpacity: 0,
    },
    ghostButton: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
    },
    dangerButton: {
        backgroundColor: '#D32F2F',
        shadowColor: '#D32F2F',
    },
    disabledButton: {
        opacity: 0.5,
    },
    sm: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    md: {
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
    },
    lg: {
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.xl,
    },
    text: {
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    smText: {
        fontSize: fontSize.sm,
    },
    mdText: {
        fontSize: fontSize.md,
    },
    lgText: {
        fontSize: fontSize.lg,
    },
    primaryText: {
        color: '#FFFFFF',
    },
    outlineText: {
        color: colors.primary,
    },
    dangerText: {
        color: '#FFFFFF',
    },
    disabledText: {
        color: colors.textSecondary,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        marginLeft: spacing.sm,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    icon: {
        fontSize: 18,
    },
});

export default Button;
