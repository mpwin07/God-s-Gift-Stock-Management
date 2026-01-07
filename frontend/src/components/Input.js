import React, { useState, useRef } from 'react';
import { TextInput, Text, View, StyleSheet, Animated } from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '../config/theme';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    editable = true,
    style,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.spring(focusAnim, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const animatedBorderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.primary],
    });

    const animatedShadowRadius = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 8],
    });

    const animatedShadowOpacity = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.15],
    });

    return (
        <View style={[styles.container, style]}>
            {label && (
                <Animated.Text
                    style={[
                        styles.label,
                        isFocused && styles.labelFocused,
                    ]}
                >
                    {label}
                </Animated.Text>
            )}
            <Animated.View
                style={[
                    styles.inputWrapper,
                    error && styles.inputWrapperError,
                    {
                        borderColor: error ? colors.error : animatedBorderColor,
                        shadowColor: colors.primary,
                        shadowRadius: animatedShadowRadius,
                        shadowOpacity: animatedShadowOpacity,
                        shadowOffset: { width: 0, height: 0 },
                    },
                ]}
            >
                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.multiline,
                        !editable && styles.disabled,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    editable={editable}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
            </Animated.View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    labelFocused: {
        color: colors.primary,
    },
    inputWrapper: {
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },
    inputWrapperError: {
        borderColor: colors.error,
    },
    input: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: fontSize.md,
        color: colors.text,
        backgroundColor: 'transparent',
    },
    multiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    disabled: {
        backgroundColor: colors.disabled,
        opacity: 0.6,
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
});

export default Input;
