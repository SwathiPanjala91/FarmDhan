import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';

export const OnboardingScreen = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { language, switchLanguage, t } = useAuth();

  const slides = [
    {
      id: 1,
      title: '1. List Agricultural Waste',
      titleTe: '1. పంట వ్యర్థాలను లిస్ట్ చేయండి',
      titleHi: '1. पराली और फसल अवशेष लिस्ट करें',
      desc: 'Do not burn crop residue. Enter your waste type (paddy straw, cotton stalks, sugarcane bagasse), quantity, and farm location.',
      descTe: 'పంట వ్యర్థాలను కాల్చకండి. వరి గడ్డి, పత్తి కట్టెలు మొదలైన వాటిని ఫోటో తీసి సులభంగా నమోదు చేయండి.',
      descHi: 'पराली को जलाएं नहीं। धान की पराली, कपास के डंठल आदि की मात्रा और स्थान दर्ज करें।',
      icon: 'leaf',
      color: COLORS.primary,
    },
    {
      id: 2,
      title: '2. Find & Compare Buyers',
      titleTe: '2. కొనుగోలుదారులను పోల్చండి',
      titleHi: '2. खरीदारों और कीमतों की तुलना करें',
      desc: 'FarmDhan automatically scores and ranks nearby buyers using our weighted matching engine. Sort offers by highest price first.',
      descTe: 'మా సరిపోలే అల్గోరిథం సమీప కొనుగోలుదారులను మరియు వారి ధరలను చూపిస్తుంది. అత్యధిక ధర ఇచ్చేవారిని సులభంగా చూడండి.',
      descHi: 'हमारा सिस्टम खरीदारों को स्कोर करता है। सबसे ज्यादा कीमत देने वाले खरीदारों की तुलना करें।',
      icon: 'trending-up',
      color: COLORS.accent,
    },
    {
      id: 3,
      title: '3. Choose the Best Option',
      titleTe: '3. ఉత్తమ కొనుగోలుదారుని ఎంచుకోండి',
      titleHi: '3. सबसे अच्छा विकल्प खुद चुनें',
      desc: 'You always hold the control! Review buyer terms and confirm your preferred buyer. We never automatically sell your crop residue.',
      descTe: 'తుది నిర్ణయం ఎల్లప్పుడూ మీదే! మీ పంటను యాప్ ఎప్పుడూ ఆటోమేటిక్‌గా అమ్మదు. మీకు నచ్చిన కొనుగోలుదారుని మీరే ఎంచుకోండి.',
      descHi: 'अंतिम फैसला हमेशा आपका रहेगा! अपनी पसंद का खरीदार चुनें। आपकी पराली कभी अपने आप नहीं बेची जाएगी।',
      icon: 'checkmark-circle',
      color: COLORS.secondary,
    },
  ];

  const slide = slides[currentSlide];

  const getSlideTitle = () => {
    if (language === 'te') return slide.titleTe;
    if (language === 'hi') return slide.titleHi;
    return slide.title;
  };

  const getSlideDesc = () => {
    if (language === 'te') return slide.descTe;
    if (language === 'hi') return slide.descHi;
    return slide.desc;
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar with Language Selector */}
      <View style={styles.topBar}>
        <View style={styles.langSelector}>
          {['en', 'te', 'hi'].map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => switchLanguage(l)}
              style={[styles.langChip, language === l && styles.langChipActive]}
            >
              <Text
                style={[
                  styles.langChipText,
                  language === l && styles.langChipTextActive,
                ]}
              >
                {l === 'en' ? 'English' : l === 'te' ? 'తెలుగు' : 'हिंदी'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Content */}
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${slide.color}18` }]}>
          <Ionicons name={slide.icon} size={72} color={slide.color} />
        </View>

        <Text style={styles.title}>{getSlideTitle()}</Text>
        <Text style={styles.description}>{getSlideDesc()}</Text>
      </View>

      {/* Indicators and Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicator,
                currentSlide === i && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        <Button
          title={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={{ width: '100%' }}
        />
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 3,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langChipActive: {
    backgroundColor: COLORS.primary,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
    padding: 6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E0',
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
});
