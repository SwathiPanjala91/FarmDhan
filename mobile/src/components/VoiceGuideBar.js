import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import {
  SCREEN_GUIDES,
  speakScreenGuide,
  stopVoice,
  addSpeechListener,
} from '../utils/voiceAssistant';

export const VoiceGuideBar = ({ screenKey, customTitle, customSub, style }) => {
  const { language } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const guide = SCREEN_GUIDES[screenKey] || {};
  const titleText =
    customTitle ||
    guide.title?.[language] ||
    guide.title?.en ||
    'Voice Guidance';

  const subText =
    customSub ||
    guide.sub?.[language] ||
    guide.sub?.en ||
    'Tap speaker button to hear voice instructions in your language';

  useEffect(() => {
    // Register listener for speech status
    const unsubscribe = addSpeechListener((speaking) => {
      setIsPlaying(speaking);
    });

    return () => {
      unsubscribe();
      stopVoice();
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  const toggleVoice = () => {
    if (isPlaying) {
      stopVoice();
      setIsPlaying(false);
    } else {
      speakScreenGuide(screenKey, language, () => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const getButtonLabel = () => {
    if (isPlaying) {
      if (language === 'te') return 'ఆపండి (Stop)';
      if (language === 'hi') return 'रोकें (Stop)';
      return 'Stop Voice';
    }
    if (language === 'te') return 'సూచనలు వినండి';
    if (language === 'hi') return 'निर्देश सुनें';
    return 'Hear Instructions';
  };

  return (
    <View style={[styles.container, SHADOWS.small, style]}>
      <View style={styles.leftContent}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.title} numberOfLines={1}>{titleText}</Text>
        </View>
        <Text style={styles.sub} numberOfLines={2}>{subText}</Text>
      </View>

      {/* Large Visible Speaker Button */}
      <TouchableOpacity
        style={[styles.speakerBtn, isPlaying && styles.speakerBtnPlaying]}
        onPress={toggleVoice}
        activeOpacity={0.82}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons
            name={isPlaying ? 'stop-circle' : 'volume-high'}
            size={22}
            color={isPlaying ? '#FFFFFF' : COLORS.primary}
          />
        </Animated.View>
        <Text style={[styles.btnText, isPlaying && styles.btnTextPlaying]}>
          {getButtonLabel()}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F8F1',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  leftContent: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    lineHeight: 16,
  },
  speakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  speakerBtnPlaying: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  btnText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  btnTextPlaying: {
    color: '#FFFFFF',
  },
});
