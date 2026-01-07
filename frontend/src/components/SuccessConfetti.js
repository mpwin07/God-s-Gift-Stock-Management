import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors } from '../config/theme';

const { width, height } = Dimensions.get('window');

/**
 * Success Confetti Component
 * Use ref.current.fire() to trigger confetti celebration
 * 
 * Usage:
 * const confettiRef = useRef();
 * <SuccessConfetti ref={confettiRef} />
 * // Then: confettiRef.current?.fire();
 */
const SuccessConfetti = forwardRef((props, ref) => {
    const [firing, setFiring] = useState(false);
    const [key, setKey] = useState(0);

    useImperativeHandle(ref, () => ({
        fire: () => {
            setFiring(true);
            setKey(prev => prev + 1);
        },
    }));

    if (!firing) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <ConfettiCannon
                key={key}
                count={80}
                origin={{ x: width / 2, y: height }}
                autoStart={true}
                fadeOut={true}
                fallSpeed={3000}
                explosionSpeed={350}
                colors={[
                    colors.primary,
                    colors.coral,
                    colors.lightPink,
                    '#FFD700',  // Gold
                    '#FFFFFF',  // White
                ]}
                onAnimationEnd={() => setFiring(false)}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },
});

export default SuccessConfetti;
