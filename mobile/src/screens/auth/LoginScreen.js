import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { speakPrompt, speakVoice, stopVoice } from '../../utils/voiceAssistant';

export const LoginScreen = ({ navigation, route }) => {
  const [loginMode, setLoginMode] = useState('otp'); // Default to 'otp' as primary, with 'password' secondary
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // For OTP mode: 1 = Phone, 2 = Code
  const [selectedRole, setSelectedRole] = useState(route?.params?.role || 'farmer'); // 'farmer' or 'buyer'
  const [activeField, setActiveField] = useState('phone'); // 'phone' or 'password'
  const [localError, setLocalError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const {
    login,
    sendOTP,
    resendOTP,
    loginWithOTP,
    loading,
    authError,
    language,
    switchLanguage,
    t,
  } = useAuth();

  // Voice greeting upon entering login screen
  useEffect(() => {
    speakPrompt('loginPhone', language);
    return () => {
      stopVoice();
    };
  }, [language]);

  // Cooldown countdown timer effect
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleFieldFocus = (fieldKey, promptKey) => {
    setActiveField(fieldKey);
    speakPrompt(promptKey, language);
  };

  // Password Login Handler
  const handlePasswordLogin = async () => {
    setLocalError(null);

    const cleanPhone = phone ? phone.trim() : '';
    if (!cleanPhone || cleanPhone.length < 10) {
      const msg =
        language === 'te'
          ? 'దయచేసి మీ 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter your 10-digit mobile number.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('Mobile Number Required', msg);
      return;
    }

    if (!password || password.trim().length === 0) {
      const msg =
        language === 'te'
          ? 'దయచేసి మీ పాస్‌వర్డ్‌ను నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया अपना पासवर्ड दर्ज करें।'
          : 'Please enter your password.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('Password Required', msg);
      return;
    }

    const res = await login(cleanPhone, password.trim());
    if (res.success) {
      const welcomeBack =
        language === 'te'
          ? 'లాగిన్ విజయవంతమైంది. స్వాగతం!'
          : language === 'hi'
          ? 'लॉगिन सफल रहा। स्वागत है!'
          : 'Login successful. Welcome back!';
      speakVoice(welcomeBack, language);
      navigation.replace(res.user.role === 'buyer' ? 'BuyerTabs' : 'FarmerTabs');
    } else {
      const errMsg = res.message || 'Login failed. Please check your credentials.';
      setLocalError(errMsg);
      speakVoice(errMsg, language);
      Alert.alert('Login Failed', errMsg);
    }
  };

  // OTP Login Handlers
  const handleSendOtp = async () => {
    setLocalError(null);
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      const msg =
        language === 'te'
          ? 'దయచేసి సరైన 10 అంకెల భారతీయ మొబైల్ నంబరును నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit Indian mobile number.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('Mobile Number Required', msg);
      return;
    }

    const res = await sendOTP(cleanPhone);
    if (res.success) {
      setStep(2);
      setOtp('');
      setCooldown(res.cooldownSeconds || 45);
      speakPrompt('otpSent', language);
    } else {
      if (res.requiresRegistration) {
        const notFoundMsg =
          language === 'te'
            ? 'ఈ నంబర్‌తో ఖాతా నమోదు కాలేదు. దయచేసి రైతు లేదా కొనుగోలుదారుగా నమోదు చేసుకోండి.'
            : language === 'hi'
            ? 'इस नंबर पर कोई खाता नहीं मिला। कृपया पहले पंजीकरण करें।'
            : 'No account registered with this phone number. Please register first as a Farmer or Buyer.';
        Alert.alert(
          language === 'te' ? 'ఖాతా లేదు' : language === 'hi' ? 'खाता नहीं मिला' : 'Account Not Found',
          notFoundMsg,
          [
            {
              text: language === 'te' ? 'ఇప్పుడే నమోదు చేయండి' : language === 'hi' ? 'पंजीकरण करें' : 'Register Now',
              onPress: () => navigation.navigate('Register'),
            },
            { text: language === 'te' ? 'రద్దు' : language === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        const errMsg = res.message || 'Could not send OTP';
        setLocalError(errMsg);
        if (res.cooldownRemaining) {
          setCooldown(res.cooldownRemaining);
        }
        Alert.alert('Notice', errMsg);
      }
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLocalError(null);
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

    const res = await resendOTP(cleanPhone);
    if (res.success) {
      setOtp('');
      setCooldown(res.cooldownSeconds || 45);
      speakPrompt('otpSent', language);
      Alert.alert(
        language === 'te' ? 'OTP పంపబడింది' : language === 'hi' ? 'OTP भेजा गया' : 'OTP Sent',
        language === 'te'
          ? 'మీ మొబైల్ నంబరుకు కొత్త 6 అంకెల OTP పంపబడింది.'
          : language === 'hi'
          ? 'आपके मोबाइल नंबर पर नया 6 अंकों का OTP भेजा गया है।'
          : 'A fresh 6-digit OTP has been sent to your mobile number.'
      );
    } else {
      const errMsg = res.message || 'Could not resend OTP';
      setLocalError(errMsg);
      if (res.cooldownRemaining) {
        setCooldown(res.cooldownRemaining);
      }
      Alert.alert('Notice', errMsg);
    }
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    const cleanOtp = otp ? otp.trim() : '';
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      const msg =
        language === 'te'
          ? 'దయచేసి 6 అంకెల OTP కోడ్‌ను నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया 6 अंकों का OTP कोड दर्ज करें।'
          : 'Please enter the 6-digit OTP code.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('6-Digit OTP Required', msg);
      return;
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const res = await loginWithOTP(cleanPhone, cleanOtp, selectedRole);
    if (res.success) {
      const welcomeBack =
        language === 'te'
          ? 'OTP ధృవీకరించబడింది. స్వాగతం!'
          : language === 'hi'
          ? 'OTP सत्यापित हुआ। स्वागत है!'
          : 'OTP verified successfully. Welcome to FarmDhan!';
      speakVoice(welcomeBack, language);
      navigation.replace(res.user.role === 'buyer' ? 'BuyerTabs' : 'FarmerTabs');
    } else {
      const errMsg = res.message || 'Invalid code. Please try again.';
      setLocalError(errMsg);

      // Gracefully handle role mismatch (e.g. Buyer account tried logging in as Farmer)
      if (errMsg.toLowerCase().includes('registered as a')) {
        const isBuyerAccount = errMsg.toLowerCase().includes('buyer');
        const correctRole = isBuyerAccount ? 'buyer' : 'farmer';
        const roleLabel = isBuyerAccount ? t('roleBuyer') : t('roleFarmer');

        Alert.alert(
          t('selectLoginMode'),
          t('switchRolePrompt', { role: roleLabel }),
          [
            {
              text: isBuyerAccount ? t('switchToBuyerMode') : t('switchToFarmerMode'),
              onPress: async () => {
                setSelectedRole(correctRole);
                setLocalError(null);
                const retryRes = await loginWithOTP(cleanPhone, cleanOtp, correctRole);
                if (retryRes.success) {
                  navigation.replace(retryRes.user.role === 'buyer' ? 'BuyerTabs' : 'FarmerTabs');
                } else {
                  setLocalError(retryRes.message || 'Verification failed');
                }
              },
            },
            { text: t('cancel'), style: 'cancel' },
          ]
        );
        return;
      }

      if (res.code === 'OTP_EXPIRED') {
        speakPrompt('otpExpired', language);
      } else if (res.code === 'MAX_ATTEMPTS_EXCEEDED') {
        speakPrompt('otpMaxAttempts', language);
      } else {
        speakPrompt('otpInvalid', language);
      }
      Alert.alert('Verification Failed', errMsg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header & Language Bar */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => {
            stopVoice();
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <Ionicons name="leaf" size={26} color={COLORS.primary} />
          <Text style={styles.logoTitle}>FarmDhan</Text>
        </View>

        <View style={styles.langSelector}>
          {[
            { code: 'te', label: 'తెలుగు' },
            { code: 'hi', label: 'हिंदी' },
            { code: 'en', label: 'ENG' },
          ].map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => {
                switchLanguage(l.code);
                speakPrompt(activeField === 'password' ? 'loginPassword' : 'loginPhone', l.code);
              }}
              style={[styles.langChip, language === l.code && styles.langChipActive]}
            >
              <Text
                style={[
                  styles.langChipText,
                  language === l.code && styles.langChipTextActive,
                ]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'te'
              ? 'ఫార్మ్‌ధన్ లాగిన్'
              : language === 'hi'
              ? 'फार्मधन लॉगिन'
              : 'FarmDhan Login'} 🔑
          </Text>
          <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
        </View>

        {/* Voice Guidance Interactive Banner */}
        <View style={styles.voiceGuidanceBanner}>
          <View style={styles.voiceIconCircle}>
            <Ionicons name="volume-high" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.voiceTextWrap}>
            <Text style={styles.voiceGuidanceTitle}>{t('voiceGuidance')}</Text>
            <Text style={styles.voiceGuidanceMsg}>
              {loginMode === 'otp'
                ? step === 1
                  ? t('voiceGuidancePhonePrompt')
                  : t('voiceGuidanceOtpPrompt')
                : activeField === 'password'
                ? t('voiceGuidancePasswordPrompt')
                : t('voiceGuidancePhonePrompt')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.replaySpeakerBtn}
            onPress={() => {
              if (loginMode === 'otp') {
                speakPrompt(step === 1 ? 'loginPhone' : 'otpSent', language);
              } else {
                speakPrompt(activeField === 'password' ? 'loginPassword' : 'loginPhone', language);
              }
            }}
          >
            <Ionicons name="volume-medium" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {(localError || authError) && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorBannerText}>{localError || authError}</Text>
          </View>
        )}

        {/* Role Mode Selector: Farmer vs Buyer Mode */}
        <View style={styles.roleToggleContainer}>
          <TouchableOpacity
            style={[
              styles.roleTab,
              selectedRole === 'farmer' && styles.roleTabActiveFarmer,
            ]}
            onPress={() => {
              setSelectedRole('farmer');
              setLocalError(null);
              speakVoice(
                language === 'te'
                  ? 'రైతు లాగిన్ మోడ్ ఎంచుకున్నారు.'
                  : language === 'hi'
                  ? 'किसान लॉगिन मोड चुना गया।'
                  : 'Farmer login mode selected.',
                language
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="leaf"
              size={18}
              color={selectedRole === 'farmer' ? '#FFFFFF' : COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.roleTabText,
                selectedRole === 'farmer' && styles.roleTabTextActive,
              ]}
            >
              {t('farmerMode')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleTab,
              selectedRole === 'buyer' && styles.roleTabActiveBuyer,
            ]}
            onPress={() => {
              setSelectedRole('buyer');
              setLocalError(null);
              speakVoice(
                language === 'te'
                  ? 'కొనుగోలుదారు లాగిన్ మోడ్ ఎంచుకున్నారు.'
                  : language === 'hi'
                  ? 'खरीदार लॉगिन मोड चुना गया।'
                  : 'Buyer login mode selected.',
                language
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="business"
              size={18}
              color={selectedRole === 'buyer' ? '#FFFFFF' : COLORS.accent}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.roleTabText,
                selectedRole === 'buyer' && styles.roleTabTextActive,
              ]}
            >
              {t('buyerMode')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Mode Toggle: OTP Login (PRIMARY / DEFAULT) vs Password Login (SECONDARY) */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, loginMode === 'otp' && styles.modeTabActive]}
            onPress={() => setLoginMode('otp')}
          >
            <Ionicons
              name="chatbox-ellipses"
              size={18}
              color={loginMode === 'otp' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeTabText, loginMode === 'otp' && styles.modeTabTextActive]}>
              {t('loginTabOtp')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, loginMode === 'password' && styles.modeTabActive]}
            onPress={() => setLoginMode('password')}
          >
            <Ionicons
              name="lock-closed"
              size={18}
              color={loginMode === 'password' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeTabText, loginMode === 'password' && styles.modeTabTextActive]}>
              {t('loginTabPassword')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PRIMARY TAB: OTP LOGIN FORM */}
        {loginMode === 'otp' ? (
          <View style={styles.form}>
            {step === 1 ? (
              <>
                <View style={styles.fieldHeaderRow}>
                  <Text style={styles.label}>{t('phoneNumber')}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setActiveField('phone');
                      speakPrompt('loginPhone', language);
                    }}
                  >
                    <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, styles.inputFocused]}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('phonePlaceholder')}
                    placeholderTextColor="#A0AEC0"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      if (localError) setLocalError(null);
                    }}
                    onFocus={() => handleFieldFocus('phone', 'loginPhone')}
                  />
                </View>

                <Button
                  title={loading ? t('loading') : t('sendOtpBtn')}
                  onPress={handleSendOtp}
                  loading={loading}
                  style={{ marginTop: 20 }}
                />
              </>
            ) : (
              <>
                <View style={styles.otpNoticeBanner}>
                  <Ionicons name="chatbox-ellipses" size={22} color={COLORS.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.otpNoticeTitle}>
                      {t('otpSentBanner')} {phone}
                    </Text>
                    <Text style={styles.otpNoticeSub}>{t('enter6DigitOtp')}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setStep(1);
                      setLocalError(null);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Text style={styles.editPhoneText}>{t('changePhone')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldHeaderRow}>
                  <Text style={styles.label}>{t('enter6DigitOtp')}</Text>
                  <TouchableOpacity
                    onPress={() => speakPrompt('otpSent', language)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="volume-medium-outline" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, styles.inputFocused, { justifyContent: 'center' }]}>
                  <Ionicons name="key-outline" size={22} color={COLORS.primary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        letterSpacing: 12,
                        fontSize: 24,
                        fontWeight: '800',
                        color: COLORS.primaryDark,
                        textAlign: 'center',
                      },
                    ]}
                    placeholder="••••••"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(val) => {
                      setOtp(val);
                      if (localError) setLocalError(null);
                    }}
                    autoFocus
                  />
                </View>

                <Button
                  title={loading ? t('loading') : t('verifyAndLogin')}
                  onPress={handleVerifyOtp}
                  loading={loading}
                  style={{ marginTop: 20 }}
                />

                <View style={styles.resendContainer}>
                  {cooldown > 0 ? (
                    <Text style={styles.cooldownText}>
                      ⏳ {t('resendIn')}{' '}
                      <Text style={{ fontWeight: '800', color: COLORS.primary }}>
                        {cooldown < 10 ? `0${cooldown}` : cooldown}s
                      </Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp} style={styles.resendBtnActive}>
                      <Ionicons name="refresh-outline" size={18} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.resendBtnText}>{t('resendOtp')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        ) : (
          /* SECONDARY TAB: PASSWORD LOGIN FORM */
          <View style={styles.form}>
            {/* Field 1: Phone */}
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.label}>{t('phoneNumber')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveField('phone');
                  speakPrompt('loginPhone', language);
                }}
              >
                <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, activeField === 'phone' && styles.inputFocused]}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder={t('phonePlaceholder')}
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (localError) setLocalError(null);
                }}
                onFocus={() => handleFieldFocus('phone', 'loginPhone')}
              />
            </View>

            {/* Field 2: Password */}
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.label}>{t('password')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveField('password');
                  speakPrompt('loginPassword', language);
                }}
              >
                <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, activeField === 'password' && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('passwordPlaceholder')}
                placeholderTextColor="#A0AEC0"
                secureTextEntry
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (localError) setLocalError(null);
                }}
                onFocus={() => handleFieldFocus('password', 'loginPassword')}
              />
            </View>

            <Button
              title={loading ? t('loading') : t('loginWithPasswordBtn')}
              onPress={handlePasswordLogin}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </View>
        )}

        {/* Register Navigation Section */}
        <View style={styles.registerBox}>
          <Text style={styles.registerPrompt}>{t('dontHaveAccount')}</Text>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => {
              stopVoice();
              navigation.navigate('Register');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.registerBtnText}>{t('registerNow')} →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    marginLeft: 6,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 3,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langChipActive: {
    backgroundColor: COLORS.primary,
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  header: {
    marginBottom: 16,
    marginTop: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  voiceGuidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF7ED',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  voiceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceTextWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  voiceGuidanceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
  },
  voiceGuidanceMsg: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
    marginTop: 2,
  },
  replaySpeakerBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: COLORS.primary,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  form: {
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#F7FCF7',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  otpNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  otpNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  otpNoticeSub: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 1,
  },
  editPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  resendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  resendBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EDF7ED',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  registerBox: {
    marginTop: 28,
    padding: 18,
    backgroundColor: '#F7FCF7',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    width: '100%',
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  roleTabActiveFarmer: {
    backgroundColor: COLORS.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  roleTabActiveBuyer: {
    backgroundColor: COLORS.accent,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
});
