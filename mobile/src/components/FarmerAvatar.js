import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

/**
 * FarmerAvatar Component
 * Friendly, modern Indian farmer vector avatar for FarmDhan Voice & AI Assistant.
 * Supports sizes ('small' | 'medium' | 'large') and visual states ('idle' | 'listening' | 'processing' | 'speaking').
 */
export const FarmerAvatar = ({
  size = 'medium',
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'speaking'
  showStatusLabel = false,
  style,
}) => {
  const { t } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for listening & speaking
  useEffect(() => {
    let anim = null;
    if (state === 'listening' || state === 'speaking') {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: state === 'listening' ? 600 : 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: state === 'listening' ? 600 : 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [state]);

  // Rotation animation for processing state
  useEffect(() => {
    let rotateLoop = null;
    if (state === 'processing') {
      rotateAnim.setValue(0);
      rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoop.start();
    } else {
      rotateAnim.setValue(0);
    }
    return () => {
      if (rotateLoop) rotateLoop.stop();
    };
  }, [state]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Dimension scaling
  const dim = size === 'small' ? 36 : size === 'large' ? 84 : 54;
  const iconSize = size === 'small' ? 20 : size === 'large' ? 46 : 30;
  const badgeSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;

  // State colors
  const ringColor =
    state === 'listening'
      ? '#EF4444' // Active red pulse
      : state === 'processing'
      ? '#F59E0B' // Amber processing
      : state === 'speaking'
      ? '#10B981' // Vibrant green speech
      : '#2E7D32'; // Default farm green

  const badgeIcon =
    state === 'listening'
      ? 'mic'
      : state === 'processing'
      ? 'sync'
      : state === 'speaking'
      ? 'volume-high'
      : 'leaf';

  const statusLabel =
    state === 'listening'
      ? t('avatarListeningText')
      : state === 'processing'
      ? t('avatarProcessingText')
      : state === 'speaking'
      ? t('avatarSpeakingText')
      : t('avatarIdleText');

  return (
    <View style={[styles.wrapper, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: dim + (size === 'large' ? 14 : 8),
            height: dim + (size === 'large' ? 14 : 8),
            borderRadius: (dim + 14) / 2,
            borderColor: ringColor,
            borderWidth: size === 'small' ? 2 : 3,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Farmer Illustration Vector Composition */}
        <View
          style={[
            styles.avatarCircle,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: COLORS.primaryDark || '#1E5E24',
            },
          ]}
        >
          {/* Turban / Pagri Visual Element */}
          <View
            style={[
              styles.pagriAccent,
              {
                width: dim * 0.76,
                height: dim * 0.32,
                borderRadius: dim * 0.16,
              },
            ]}
          />

          {/* Friendly Farmer Icon */}
          <Ionicons name="person" size={iconSize} color="#FFFFFF" style={styles.personIcon} />

          {/* Golden Agriculture Wheat Pin */}
          <View style={styles.leafPin}>
            <Ionicons name="leaf" size={size === 'small' ? 8 : 12} color="#F59E0B" />
          </View>
        </View>

        {/* Live State Action Badge */}
        <Animated.View
          style={[
            styles.stateBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: ringColor,
              transform: state === 'processing' ? [{ rotate: spin }] : [],
            },
          ]}
        >
          <Ionicons
            name={badgeIcon}
            size={badgeSize * 0.62}
            color="#FFFFFF"
          />
        </Animated.View>
      </Animated.View>

      {/* Optional Localized State Text Below Avatar */}
      {showStatusLabel && (
        <Text style={[styles.statusText, { color: ringColor }]}>
          {statusLabel}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderStyle: 'solid',
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  pagriAccent: {
    position: 'absolute',
    top: 2,
    backgroundColor: '#15803D', // Emerald turban band
    borderBottomWidth: 1.5,
    borderBottomColor: '#F59E0B', // Gold border
  },
  personIcon: {
    marginTop: 4,
  },
  leafPin: {
    position: 'absolute',
    top: 4,
    right: 6,
  },
  stateBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  statusText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
