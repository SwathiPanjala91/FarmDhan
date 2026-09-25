import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { speakScreenGuide, stopVoice } from '../utils/voiceAssistant';

export const Header = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  unreadNotifs = 0,
  onNotificationPress,
  voiceScreenKey,
  onVoicePress,
  rightAction,
}) => {
  const { language, switchLanguage, role, t } = useAuth();
  const [speaking, setSpeaking] = React.useState(false);
  const navigation = useNavigation();

  const handleVoiceHeader = () => {
    if (onVoicePress) {
      onVoicePress();
    } else if (voiceScreenKey) {
      if (speaking) {
        stopVoice();
        setSpeaking(false);
      } else {
        speakScreenGuide(voiceScreenKey, language, () => setSpeaking(false));
        setSpeaking(true);
      }
    }
  };

  const cycleLanguage = () => {
    const langs = ['en', 'te', 'hi'];
    const nextIdx = (langs.indexOf(language) + 1) % langs.length;
    switchLanguage(langs[nextIdx]);
  };

  const getLangBadge = () => {
    if (language === 'te') return 'తెలుగు';
    if (language === 'hi') return 'हिंदी';
    return 'ENG';
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title || t('appTitle')}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Verified Role Badge (Informational only — prevents accidental role mutation) */}
        <View style={styles.roleTogglePill}>
          <Text style={styles.roleToggleText}>
            {role === 'buyer' ? t('roleBuyerBadge') : t('roleFarmerBadge')}
          </Text>
        </View>

        {/* Quick Voice Assistance Shortcut Button */}
        {(voiceScreenKey || onVoicePress) && (
          <TouchableOpacity style={styles.voiceBtn} onPress={handleVoiceHeader} activeOpacity={0.8}>
            <Ionicons name={speaking ? 'stop-circle' : 'volume-high'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* 1-Tap Language Switcher */}
        <TouchableOpacity style={styles.langPill} onPress={cycleLanguage} activeOpacity={0.8}>
          <Ionicons name="globe-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.langText}>{getLangBadge()}</Text>
        </TouchableOpacity>

        {/* Notifications Icon */}
        {onNotificationPress ? (
          <TouchableOpacity style={styles.notifBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unreadNotifs > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null}

        {rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#D1E7DD',
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTogglePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  roleToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  voiceBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 6,
    borderRadius: 16,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  notifBtn: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
