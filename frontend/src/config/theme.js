/**
 * Premium Theme Configuration
 * God's Gift Bath Soap - Flagship Quality Design System
 */

// ============================================
// 🎨 COLOR PALETTE
// ============================================
export const colors = {
    // Brand Colors
    lightPink: '#FDEAEF',
    coral: '#FF8F8F',
    red: '#D72F3F',
    darkRed: '#941A1D',
    deepMaroon: '#5F1010',

    // Functional Colors
    primary: '#D72F3F',
    secondary: '#FF8F8F',
    background: '#FDEAEF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    text: '#2D1810',
    textSecondary: '#5F1010',
    textMuted: '#8B6B6B',
    textLight: '#FF8F8F',

    // Status Colors
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',

    // UI Colors
    border: 'rgba(255, 143, 143, 0.3)',
    borderLight: 'rgba(255, 143, 143, 0.15)',
    disabled: '#E5E5E5',
    placeholder: '#9CA3AF',
    overlay: 'rgba(45, 24, 16, 0.5)',
};

// ============================================
// 📐 SPACING SYSTEM (8-Point Grid)
// ============================================
export const spacing = {
    xxs: 4,    // Micro gaps, icon spacing
    xs: 8,     // Tight spacing, inline elements
    sm: 12,    // Element gaps
    md: 16,    // Default padding
    lg: 24,    // Section spacing
    xl: 32,    // Major sections
    xxl: 48,   // Page margins
    xxxl: 64,  // Dramatic separation
};

// ============================================
// 🔤 TYPOGRAPHY SYSTEM
// ============================================
export const typography = {
    // Hero - Big numbers, main metrics
    hero: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 40,
    },
    // H1 - Page titles
    h1: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.3,
        lineHeight: 34,
    },
    // H2 - Section headers
    h2: {
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: 0,
        lineHeight: 28,
    },
    // H3 - Card titles
    h3: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: 0.1,
        lineHeight: 22,
    },
    // Body - Regular text
    body: {
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: 0.2,
        lineHeight: 22,
    },
    // Body Bold
    bodyBold: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
        lineHeight: 22,
    },
    // Caption - Secondary info
    caption: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.3,
        lineHeight: 18,
    },
    // Micro - Badges, labels
    micro: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
};

// Legacy fontSize support
export const fontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    xxxl: 36,
};

export const fontWeight = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
};

// ============================================
// 📦 BORDER RADIUS
// ============================================
export const borderRadius = {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    round: 999,
};

// ============================================
// 🌫️ SHADOWS (Premium depth)
// ============================================
export const shadows = {
    xs: {
        shadowColor: '#2D1810',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    sm: {
        shadowColor: '#2D1810',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    md: {
        shadowColor: '#2D1810',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    lg: {
        shadowColor: '#2D1810',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
    xl: {
        shadowColor: '#2D1810',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.16,
        shadowRadius: 32,
        elevation: 12,
    },
};

// ============================================
// ⚡ MOTION / ANIMATION
// ============================================
export const motion = {
    // Durations
    duration: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500,
        emphasis: 800,
    },
    // Spring configs
    spring: {
        gentle: { friction: 12, tension: 80 },
        snappy: { friction: 8, tension: 120 },
        bouncy: { friction: 5, tension: 100 },
    },
    // Delays for staggering
    stagger: {
        fast: 50,
        normal: 100,
        slow: 150,
    },
};

// ============================================
// 📱 LAYOUT
// ============================================
export const layout = {
    screenPadding: spacing.lg,
    cardPadding: spacing.md,
    sectionGap: spacing.xl,
    itemGap: spacing.sm,
};

// ============================================
// 🎯 EXPORT
// ============================================
export const theme = {
    colors,
    spacing,
    typography,
    fontSize,
    fontWeight,
    borderRadius,
    shadows,
    motion,
    layout,
};

export default theme;
