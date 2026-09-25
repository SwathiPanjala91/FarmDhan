import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export const SplashScreen = ({ navigation }) => {
  const { user, t } = useAuth();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.85);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (user) {
        navigation.replace(user.role === 'buyer' ? 'BuyerTabs' : 'FarmerTabs');
      } else {
        navigation.replace('Welcome');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [user]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={64} color="#FFFFFF" />
        </View>

        <Text style={styles.appName}>FarmDhan</Text>
        <Text style={styles.teluguName}>ఫార్మ్‌ధన్ • फार्मधन</Text>

        <View style={styles.divider} />

        <Text style={styles.tagline}>"Turn Agricultural Waste into Value."</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Smart Agricultural Residue Marketplace</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Empowering Indian Farmers & FPOs</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  teluguName: {
    fontSize: 16,
    color: '#D1E7DD',
    marginTop: 4,
    fontWeight: '600',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginVertical: 18,
  },
  tagline: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#F4FBF4',
    textAlign: 'center',
    fontWeight: '500',
  },
  badge: {
    marginTop: 24,
    backgroundColor: 'rgba(245, 127, 23, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  badgeText: {
    color: '#FFE082',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    color: '#A5D6A7',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
