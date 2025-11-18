// Dark Theme Colors
export const darkColors = {
  // Backgrounds
  background: '#0A0A0A',
  card: '#1A1A1A',
  muted: '#2A2A2A',
  border: 'rgba(255, 255, 255, 0.1)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#606060',
  
  // Brand
  primary: '#00FF88',
  secondary: '#0EA5E9',
  
  // Status
  destructive: '#EF4444',
  success: '#00FF88',
  warning: '#F59E0B',
};

// Light Theme Colors
export const lightColors = {
  // Backgrounds
  background: '#FFFFFF',
  card: '#F8F9FA',
  muted: '#E9ECEF',
  border: 'rgba(0, 0, 0, 0.1)',
  
  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  
  // Brand
  primary: '#00C770', // Slightly darker green for light mode
  secondary: '#0EA5E9',
  
  // Status
  destructive: '#DC3545',
  success: '#00C770',
  warning: '#F59E0B',
};

// Default to dark theme (backward compatibility)
export const colors = darkColors;

// Function to get colors based on theme
export const getColors = (isDark: boolean) => (isDark ? darkColors : lightColors);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
  h1: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  tiny: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
};
