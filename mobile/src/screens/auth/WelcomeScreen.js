import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { speakPrompt, speakVoice, stopVoice } from '../../utils/voiceAssistant';

export const WelcomeScreen = ({ navigation }) => {
  const { language, switchLanguage } = useAuth();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [targetScreen, setTargetScreen] = useState('Login'); // 'Login' or 'Register'

  const handleActionPress = (screenName) => {
    setTargetScreen(screenName);
    setLangModalVisible(true);
    // Voice prompt greeting and asking to select language
    speakPrompt('welcome', language);
  };

  const handleSelectLanguage = (langCode) => {
    stopVoice();
    switchLanguage(langCode);
    setLangModalVisible(false);

    // Speak quick confirmation in chosen language before navigating
    if (langCode === 'te') {
      speakVoice('తెలుగు ఎంచుకున్నారు. స్వాగతం.', 'te');
    } else if (langCode === 'hi') {
      speakVoice('हिंदी चुनी गई। स्वागत है।', 'hi');
    } else {
      speakVoice('English selected. Welcome.', 'en');
    }

    navigation.navigate(targetScreen);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Branding Area */}
      <View style={styles.headerArea}>
        <View style={styles.logoBadge}>
          <Ionicons name="leaf" size={68} color="#FFFFFF" />
        </View>
        <Text style={styles.appTitle}>FarmDhan</Text>
        <Text style={styles.multilingualTitle}>ఫార్మ్‌ధన్ • फार्मधन</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Smart Agricultural Residue Marketplace</Text>
        <Text style={styles.subTagline}>Turn Agricultural Waste into Value</Text>
      </View>

      {/* Main Action Buttons (Only Login & Register - No Input Fields) */}
      <View style={styles.buttonContainer}>
        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[styles.primaryButton, SHADOWS.medium]}
          onPress={() => handleActionPress('Login')}
          activeOpacity={0.88}
        >
          <View style={styles.btnIconCircle}>
            <Ionicons name="log-in" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.btnTextContainer}>
            <Text style={styles.primaryButtonText}>LOGIN</Text>
            <Text style={styles.buttonSubText}>లాగిన్ అవ్వండి • लॉग इन करें</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* REGISTER BUTTON */}
        <TouchableOpacity
          style={[styles.secondaryButton, SHADOWS.medium]}
          onPress={() => handleActionPress('Register')}
          activeOpacity={0.88}
        >
          <View style={[styles.btnIconCircle, { backgroundColor: COLORS.accent }]}>
            <Ionicons name="person-add" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.btnTextContainer}>
            <Text style={styles.secondaryButtonText}>REGISTER</Text>
            <Text style={styles.buttonSubTextDark}>కొత్త ఖాతా • नया पंजीकरण</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
      </View>

      {/* Quick Language Switcher Bar at Bottom */}
      <View style={styles.footerLangBar}>
        <Text style={styles.footerLangLabel}>Language / భాష / भाषा:</Text>
        <View style={styles.langPills}>
          {[
            { code: 'te', label: 'తెలుగు' },
            { code: 'hi', label: 'हिंदी' },
            { code: 'en', label: 'English' },
          ].map((item) => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.langPill,
                language === item.code && styles.langPillActive,
              ]}
              onPress={() => {
                switchLanguage(item.code);
                speakPrompt('welcome', item.code);
              }}
            >
              <Text
                style={[
                  styles.langPillText,
                  language === item.code && styles.langPillTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Accessible Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          stopVoice();
          setLangModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Speaker & Title */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalSpeakerIcon}>
                <Ionicons name="volume-high" size={26} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Select Your Language</Text>
                <Text style={styles.modalSubtitle}>దయచేసి మీ భాషను ఎంచుకోండి • भाषा चुनें</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  stopVoice();
                  speakPrompt('welcome', language);
                }}
                style={styles.replaySpeakerBtn}
              >
                <Ionicons name="play" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Language Options (Large Cards for Low-Literacy Usability) */}
            <View style={styles.langCardsContainer}>
              {/* Telugu */}
              <TouchableOpacity
                style={[
                  styles.langCard,
                  language === 'te' && styles.langCardSelected,
                ]}
                onPress={() => handleSelectLanguage('te')}
                activeOpacity={0.85}
              >
                <View style={styles.langCardLeft}>
                  <Text style={styles.langCardSymbol}>🌾</Text>
                  <View>
                    <Text style={styles.langCardTitle}>తెలుగు</Text>
                    <Text style={styles.langCardSub}>Telugu • ఆంధ్రప్రదేశ్ & తెలంగాణ</Text>
                  </View>
                </View>
                <Ionicons
                  name={language === 'te' ? 'checkmark-circle' : 'chevron-forward'}
                  size={24}
                  color={language === 'te' ? COLORS.primary : COLORS.textMuted}
                />
              </TouchableOpacity>

              {/* Hindi */}
              <TouchableOpacity
                style={[
                  styles.langCard,
                  language === 'hi' && styles.langCardSelected,
                ]}
                onPress={() => handleSelectLanguage('hi')}
                activeOpacity={0.85}
              >
                <View style={styles.langCardLeft}>
                  <Text style={styles.langCardSymbol}>🌾</Text>
                  <View>
                    <Text style={styles.langCardTitle}>हिंदी</Text>
                    <Text style={styles.langCardSub}>Hindi • भारत भर में</Text>
                  </View>
                </View>
                <Ionicons
                  name={language === 'hi' ? 'checkmark-circle' : 'chevron-forward'}
                  size={24}
                  color={language === 'hi' ? COLORS.primary : COLORS.textMuted}
                />
              </TouchableOpacity>

              {/* English */}
              <TouchableOpacity
                style={[
                  styles.langCard,
                  language === 'en' && styles.langCardSelected,
                ]}
                onPress={() => handleSelectLanguage('en')}
                activeOpacity={0.85}
              >
                <View style={styles.langCardLeft}>
                  <Text style={styles.langCardSymbol}>🌐</Text>
                  <View>
                    <Text style={styles.langCardTitle}>English</Text>
                    <Text style={styles.langCardSub}>National / Standard</Text>
                  </View>
                </View>
                <Ionicons
                  name={language === 'en' ? 'checkmark-circle' : 'chevron-forward'}
                  size={24}
                  color={language === 'en' ? COLORS.primary : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Cancel / Close button */}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                stopVoice();
                setLangModalVisible(false);
              }}
            >
              <Text style={styles.modalCancelText}>Close • మూసివేయండి</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#E8F5E9',
    marginBottom: 18,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1.2,
  },
  multilingualTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#388E3C',
    marginTop: 4,
  },
  divider: {
    width: 50,
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginVertical: 14,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  subTagline: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingVertical: 20,
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  btnIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  btnTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  buttonSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8F5E9',
    marginTop: 2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1.2,
  },
  buttonSubTextDark: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  footerLangBar: {
    alignItems: 'center',
    marginBottom: 10,
  },
  footerLangLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  langPills: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 3,
  },
  langPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  langPillActive: {
    backgroundColor: COLORS.primary,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  langPillTextActive: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSpeakerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  replaySpeakerBtn: {
    padding: 8,
    backgroundColor: '#F1F8E9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  langCardsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 16,
  },
  langCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langCardSymbol: {
    fontSize: 28,
    marginRight: 14,
  },
  langCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  langCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
});
