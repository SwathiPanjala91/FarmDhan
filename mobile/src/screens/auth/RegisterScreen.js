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
import { COLORS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { speakPrompt, speakVoice, stopVoice } from '../../utils/voiceAssistant';

export const RegisterScreen = ({ navigation }) => {
  const [role, setRole] = useState('farmer'); // 'farmer' or 'buyer'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [district, setDistrict] = useState('');
  const [villageOrBusiness, setVillageOrBusiness] = useState('');
  const [activeStep, setActiveStep] = useState('name'); // 'name', 'phone', 'password', 'role'
  const [localError, setLocalError] = useState(null);

  const { register, loading, authError, language, switchLanguage, t } = useAuth();

  // Voice greeting upon entering registration
  useEffect(() => {
    speakPrompt('registerName', language);
    return () => {
      stopVoice();
    };
  }, [language]);

  const handleFieldFocus = (stepKey, promptKey) => {
    setActiveStep(stepKey);
    speakPrompt(promptKey, language);
  };

  const handleRoleSelect = (newRole) => {
    setRole(newRole);
    setActiveStep('role');
    const roleText =
      newRole === 'farmer'
        ? language === 'te'
          ? 'రైతు ఎంచుకున్నారు.'
          : language === 'hi'
          ? 'किसान चुना गया।'
          : 'Farmer role selected.'
        : language === 'te'
        ? 'కొనుగోలుదారు ఎంచుకున్నారు.'
        : language === 'hi'
        ? 'खरीदार चुना गया।'
        : 'Buyer role selected.';
    speakVoice(roleText, language);
  };

  const handleRegister = async () => {
    setLocalError(null);

    if (!name || !name.trim()) {
      const msg =
        language === 'te'
          ? 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया अपना पूरा नाम दर्ज करें।'
          : 'Please enter your full name.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('Required Field', msg);
      return;
    }

    const cleanPhone = phone ? phone.trim() : '';
    if (!cleanPhone || cleanPhone.length < 10) {
      const msg =
        language === 'te'
          ? 'దయచేసి మీ 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('Mobile Number Required', msg);
      return;
    }

    if (!password || password.trim().length < 4) {
      const msg =
        language === 'te'
          ? 'దయచేసి పాస్‌వర్డ్‌ను నమోదు చేయండి (కనీసం 4 అక్షరాలు).'
          : language === 'hi'
          ? 'कृपया पासवर्ड बनाएं (कम से कम 4 अक्षर)।'
          : 'Please create a password (minimum 4 characters).';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert('Password Required', msg);
      return;
    }

    if (!district || !district.trim()) {
      const msg =
        language === 'te'
          ? 'దయచేసి మీ జిల్లా లేదా ప్రాంతాన్ని నమోదు చేయండి.'
          : language === 'hi'
          ? 'कृपया अपना ज़िला या क्षेत्र दर्ज करें।'
          : 'Please enter your district or area.';
      setLocalError(msg);
      speakVoice(msg, language);
      Alert.alert(
        language === 'te' ? 'జిల్లా అవసరం' : language === 'hi' ? 'ज़िला आवश्यक' : 'District Required',
        msg
      );
      return;
    }

    const payload = {
      name: name.trim(),
      phone: cleanPhone,
      password: password.trim(),
      role,
      district: district.trim(),
      language,
      ...(role === 'farmer'
        ? { village: villageOrBusiness.trim() || 'Rural Area' }
        : { businessName: villageOrBusiness.trim() || `${name.trim()} Biomass Enterprises` }),
    };

    const res = await register(payload);

    if (res.success) {
      const welcomeMsg =
        language === 'te'
          ? 'ఫార్మ్‌ధన్‌కు స్వాగతం! మీ ఖాతా విజయవంతంగా నమోదైంది.'
          : language === 'hi'
          ? 'फार्मधन में आपका स्वागत है! आपका खाता सफलतापूर्वक बन गया है।'
          : 'Welcome to FarmDhan! Your account has been registered successfully.';

      speakVoice(welcomeMsg, language);

      Alert.alert(
        language === 'te' ? 'స్వాగతం' : language === 'hi' ? 'स्वागत है' : 'Welcome',
        welcomeMsg,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace(role === 'buyer' ? 'BuyerTabs' : 'FarmerTabs');
            },
          },
        ]
      );
    } else {
      const errorMsg = res.message || 'Registration failed. Please try again.';
      setLocalError(errorMsg);
      speakVoice(errorMsg, language);
      Alert.alert('Registration Failed', errorMsg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header & Language Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            stopVoice();
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

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
                speakPrompt('registerName', item.code);
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

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={styles.title}>{t('register')}</Text>
        <Text style={styles.subtitle}>
          {language === 'te'
            ? 'వ్యవసాయ వ్యర్థాల మార్కెట్‌ప్లేస్‌లో చేరండి'
            : language === 'hi'
            ? 'कृषि अवशेष व्यापार से सीधे जुड़ें'
            : 'Join FarmDhan agricultural residue marketplace'}
        </Text>

        {/* Voice Assistant Interactive Guidance Banner */}
        <View style={styles.voiceGuidanceBanner}>
          <View style={styles.voiceIconCircle}>
            <Ionicons name="volume-high" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.voiceTextWrap}>
            <Text style={styles.voiceGuidanceTitle}>Voice Assistance / వాయిస్ సాయం</Text>
            <Text style={styles.voiceGuidanceMsg}>
              {activeStep === 'name' &&
                (language === 'te'
                  ? 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి.'
                  : language === 'hi'
                  ? 'कृपया अपना पूरा नाम दर्ज करें।'
                  : 'Please enter your full name.')}
              {activeStep === 'phone' &&
                (language === 'te'
                  ? 'దయచేసి మీ 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.'
                  : language === 'hi'
                  ? 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।'
                  : 'Please enter your mobile number.')}
              {activeStep === 'password' &&
                (language === 'te'
                  ? 'దయచేసి మీ పాస్‌వర్డ్‌ను తయారు చేయండి.'
                  : language === 'hi'
                  ? 'कृपया अपना पासवर्ड बनाएं।'
                  : 'Please create your password.')}
              {activeStep === 'role' &&
                (language === 'te'
                  ? 'దయచేసి రైతు లేదా కొనుగోలుదారుని ఎంచుకోండి.'
                  : language === 'hi'
                  ? 'कृपया किसान या खरीदार का चयन करें।'
                  : 'Please select Farmer or Buyer.')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.replaySpeakerBtn}
            onPress={() => {
              if (activeStep === 'name') speakPrompt('registerName', language);
              else if (activeStep === 'phone') speakPrompt('registerPhone', language);
              else if (activeStep === 'password') speakPrompt('registerPassword', language);
              else if (activeStep === 'role') speakPrompt('registerRole', language);
            }}
          >
            <Ionicons name="volume-medium" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Error Banner if registration fails */}
        {(localError || authError) && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={22} color={COLORS.error} />
            <Text style={styles.errorBannerText}>{localError || authError}</Text>
          </View>
        )}

        {/* Field 1: Full Name */}
        <View style={styles.fieldHeaderRow}>
          <Text style={styles.label}>1. {t('name')}</Text>
          <TouchableOpacity
            onPress={() => {
              setActiveStep('name');
              speakPrompt('registerName', language);
            }}
          >
            <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.inputContainer, activeStep === 'name' && styles.inputFocused]}>
          <Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={role === 'farmer' ? 'Enter full name' : 'Contact person / Representative name'}
            placeholderTextColor="#A0AEC0"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (localError) setLocalError(null);
            }}
            onFocus={() => handleFieldFocus('name', 'registerName')}
          />
        </View>

        {/* Field 2: Mobile Number */}
        <View style={styles.fieldHeaderRow}>
          <Text style={styles.label}>2. {t('phoneNumber')}</Text>
          <TouchableOpacity
            onPress={() => {
              setActiveStep('phone');
              speakPrompt('registerPhone', language);
            }}
          >
            <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.inputContainer, activeStep === 'phone' && styles.inputFocused]}>
          <Text style={styles.countryCode}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#A0AEC0"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (localError) setLocalError(null);
            }}
            onFocus={() => handleFieldFocus('phone', 'registerPhone')}
          />
        </View>

        {/* Field 3: Password */}
        <View style={styles.fieldHeaderRow}>
          <Text style={styles.label}>3. {t('password')}</Text>
          <TouchableOpacity
            onPress={() => {
              setActiveStep('password');
              speakPrompt('registerPassword', language);
            }}
          >
            <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.inputContainer, activeStep === 'password' && styles.inputFocused]}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Minimum 4 characters"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (localError) setLocalError(null);
            }}
            onFocus={() => handleFieldFocus('password', 'registerPassword')}
          />
        </View>

        {/* Field 4: Role Selection (Farmer vs Buyer) */}
        <View style={styles.fieldHeaderRow}>
          <Text style={styles.label}>4. {t('selectRole')}</Text>
          <TouchableOpacity
            onPress={() => {
              setActiveStep('role');
              speakPrompt('registerRole', language);
            }}
          >
            <Ionicons name="volume-medium-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.roleContainer}>
          {/* Farmer Card */}
          <TouchableOpacity
            style={[styles.roleCard, role === 'farmer' && styles.roleCardActive]}
            onPress={() => handleRoleSelect('farmer')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="leaf"
              size={32}
              color={role === 'farmer' ? '#FFFFFF' : COLORS.primary}
            />
            <Text style={[styles.roleCardTitle, role === 'farmer' && styles.roleCardTextActive]}>
              🌾 {t('roleFarmer')}
            </Text>
            <Text style={[styles.roleCardSub, role === 'farmer' && styles.roleCardSubActive]}>
              రైతు • Sell Crop Residue
            </Text>
          </TouchableOpacity>

          {/* Buyer Card */}
          <TouchableOpacity
            style={[styles.roleCard, role === 'buyer' && styles.roleCardActiveBuyer]}
            onPress={() => handleRoleSelect('buyer')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="business"
              size={32}
              color={role === 'buyer' ? '#FFFFFF' : COLORS.accent}
            />
            <Text style={[styles.roleCardTitle, role === 'buyer' && styles.roleCardTextActive]}>
              🏢 {t('roleBuyer')}
            </Text>
            <Text style={[styles.roleCardSub, role === 'buyer' && styles.roleCardSubActive]}>
              కొనుగోలుదారు • Buy Biomass
            </Text>
          </TouchableOpacity>
        </View>

        {/* Optional Location/Enterprise Info */}
        <Text style={styles.label}>
          {role === 'farmer' ? 'Village / Mandal (Optional)' : 'Company / Factory Name (Optional)'}
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons
            name={role === 'farmer' ? 'location-outline' : 'business-outline'}
            size={20}
            color={COLORS.primary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={role === 'farmer' ? 'e.g. Hanamkonda / Hasanparthy' : 'e.g. Bio-CNG / Pellet Plant'}
            placeholderTextColor="#A0AEC0"
            value={villageOrBusiness}
            onChangeText={setVillageOrBusiness}
          />
        </View>

        <Text style={styles.label}>
          {language === 'te' ? 'జిల్లా / ప్రాంతం' : language === 'hi' ? 'ज़िला / क्षेत्र' : 'District / Area'}
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons name="map-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={
              language === 'te'
                ? 'మీ జిల్లా లేదా ప్రాంతం నమోదు చేయండి'
                : language === 'hi'
                ? 'अपना ज़िला या क्षेत्र दर्ज करें'
                : 'Enter your district or area'
            }
            placeholderTextColor="#A0AEC0"
            value={district}
            onChangeText={(t) => {
              setDistrict(t);
              if (localError) setLocalError(null);
            }}
          />
        </View>

        {/* Submit Button */}
        <Button
          title={
            loading
              ? 'Creating Account...'
              : language === 'te'
              ? 'ఖాతా నమోదు చేయండి (Register) →'
              : language === 'hi'
              ? 'खाता बनाएं (Register) →'
              : 'Register Real Account →'
          }
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 24 }}
        />

        {/* Navigation back to Login */}
        <TouchableOpacity
          onPress={() => {
            stopVoice();
            navigation.navigate('Login');
          }}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            {language === 'te'
              ? 'ఖాతా ఇప్పటికే ఉందా? లాగిన్ అవ్వండి →'
              : language === 'hi'
              ? 'पहले से खाता है? लॉग इन करें →'
              : 'Already registered? Log in here →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    padding: 6,
  },
  langPills: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 3,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langPillActive: {
    backgroundColor: COLORS.primary,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  langPillTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    marginTop: 2,
  },
  voiceGuidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF7ED',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  voiceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
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
  inputIcon: {
    marginRight: 10,
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
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  roleCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleCardActiveBuyer: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  roleCardTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  roleCardTextActive: {
    color: '#FFFFFF',
  },
  roleCardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  roleCardSubActive: {
    color: '#E8F5E9',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
