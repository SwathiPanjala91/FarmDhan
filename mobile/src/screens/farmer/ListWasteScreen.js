import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { api } from '../../services/api';
import { speakPrompt, speakVoice, stopVoice } from '../../utils/voiceAssistant';

const WASTE_TYPES = [
  { id: 'paddy', name: 'Paddy Straw', nameTe: 'వరి గడ్డి', nameHi: 'धान की पराली', icon: '🌾' },
  { id: 'cotton', name: 'Cotton Residue', nameTe: 'పత్తి కట్టెలు', nameHi: 'कपास के डंठल', icon: '☁️' },
  { id: 'wheat', name: 'Wheat Straw', nameTe: 'గోధుమ గడ్డి', nameHi: 'गेहूं का भूसा', icon: '🌿' },
  { id: 'maize', name: 'Maize Residue', nameTe: 'మొక్కజొన్న వ్యర్థాలు', nameHi: 'मक्का अवशेष', icon: '🌽' },
  { id: 'sugarcane', name: 'Sugarcane Residue', nameTe: 'చెరకు వ్యర్థాలు', nameHi: 'गन्ना अवशेष', icon: '🎋' },
  { id: 'groundnut', name: 'Groundnut Residue', nameTe: 'వేరుశనగ వ్యర్థాలు', nameHi: 'मूंगफली अवशेष', icon: '🥜' },
  { id: 'other', name: 'Other Crop Residue', nameTe: 'ఇతర వ్యర్థాలు', nameHi: 'अन्य अवशेष', icon: '🌱' },
];

const UNITS = ['kg', 'quintal', 'ton', 'acre'];

export const ListWasteScreen = ({ navigation }) => {
  const { user, language, t } = useAuth();

  const getUnitLabel = (u) => {
    if (u === 'ton') return t('unitTon');
    if (u === 'quintal') return t('unitQuintal');
    if (u === 'acre') return t('unitAcre');
    return t('unitKg');
  };

  // Wizard Step: 1 = Type, 2 = Quantity & Unit, 3 = Price, 4 = Location, 5 = Photo, 6 = Review
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [selectedWasteType, setSelectedWasteType] = useState('Paddy Straw');
  const [customWasteType, setCustomWasteType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('ton');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const initialLoc = user?.location?.village && user?.location?.district
    ? `${user.location.village}, ${user.location.district}`
    : user?.location?.district || user?.location?.village || '';
  const [locationText, setLocationText] = useState(initialLoc);
  const [gpsCoords, setGpsCoords] = useState(user?.location || { latitude: 17.9784, longitude: 79.5941 });
  const [loading, setLoading] = useState(false);

  // Play voice prompt whenever step changes
  useEffect(() => {
    const promptKeys = [
      'listStepWasteType',
      'listStepQuantity',
      'listStepPrice',
      'listStepLocation',
      'listStepPhoto',
      'listStepReview',
    ];
    speakPrompt(promptKeys[currentStep - 1], language);

    return () => {
      stopVoice();
    };
  }, [currentStep, language]);

  const replayCurrentStepVoice = () => {
    const promptKeys = [
      'listStepWasteType',
      'listStepQuantity',
      'listStepPrice',
      'listStepLocation',
      'listStepPhoto',
      'listStepReview',
    ];
    speakPrompt(promptKeys[currentStep - 1], language);
  };

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('photo'), t('cameraPermissionRequired'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('location'), t('locationPermissionRequired'));
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setGpsCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse && reverse.length > 0) {
        const place = reverse[0];
        setLocationText(`${place.city || place.subregion || 'Local Mandal'}, ${place.region || 'Telangana'}`);
      }
      Alert.alert(t('location'), t('locUpdated', { defaultValue: 'GPS coordinates updated successfully.' }));
    } catch (err) {
      console.warn('Location error:', err);
      Alert.alert(t('location'), t('locNotice', { defaultValue: 'Using standard district coordinates for matching.' }));
    }
  };

  const validateAndNext = () => {
    if (currentStep === 1) {
      const finalType = selectedWasteType === 'Other Crop Residue' ? customWasteType : selectedWasteType;
      if (!finalType || !finalType.trim()) {
        Alert.alert(t('wasteType'), t('wasteTypeRequired'));
        return;
      }
    } else if (currentStep === 2) {
      if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
        Alert.alert(t('quantity'), t('quantityRequired'));
        return;
      }
    } else if (currentStep === 4) {
      if (!locationText || !locationText.trim()) {
        Alert.alert(t('location'), t('locationPermissionRequired'));
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const finalWasteType = selectedWasteType === 'Other Crop Residue' ? customWasteType : selectedWasteType;

    setLoading(true);
    try {
      const payload = {
        wasteType: finalWasteType,
        quantity: Number(quantity),
        unit,
        expectedPrice: expectedPrice ? Number(expectedPrice) : 0,
        description,
        image: imageUri || '',
        location: {
          latitude: gpsCoords.latitude || 17.9784,
          longitude: gpsCoords.longitude || 79.5941,
          village: locationText.includes(',')
            ? locationText.split(',')[0]?.trim()
            : user?.location?.village || '',
          district: locationText.includes(',')
            ? locationText.split(',')[1]?.trim()
            : locationText.trim() || user?.location?.district || '',
          state: user?.location?.state || 'Telangana',
        },
      };

      const res = await api.listings.create(payload);

      if (res.success) {
        speakVoice(t('listingSuccess'), language);

        Alert.alert(
          t('wasteListedSuccess'),
          t('wasteListedSuccessMsg', {
            quantity,
            unit: getUnitLabel(unit),
            wasteType: finalWasteType,
          }),
          [
            {
              text: t('viewMatchingBuyersBtn'),
              onPress: () =>
                navigation.navigate('BuyerMatching', {
                  listingId: res.listing._id,
                  wasteType: finalWasteType,
                  quantity,
                  unit,
                }),
            },
          ]
        );
      }
    } catch (err) {
      const errorMsg = err.message || 'Could not submit listing. Please try again.';
      Alert.alert(t('error'), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedWasteName = (item) => {
    if (language === 'te' && item.nameTe) return item.nameTe;
    if (language === 'hi' && item.nameHi) return item.nameHi;
    return item.name;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('createListingTitle')}
        subtitle={t('stepOf', { current: currentStep, total: totalSteps })}
        showBack={currentStep > 1}
        onBack={prevStep}
        voiceScreenKey="listWaste"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="listWaste" />

      {/* Step Progress Tracker */}
      <View style={styles.progressRow}>
        {[1, 2, 3, 4, 5, 6].map((st) => (
          <View
            key={st}
            style={[
              styles.progressDot,
              currentStep === st && styles.progressDotActive,
              currentStep > st && styles.progressDotCompleted,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ======================================================== */}
        {/* STEP 1: WASTE TYPE SELECTION */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumberBadge}>1</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stepTitle}>{t('step1Title')}</Text>
                <Text style={styles.stepSub}>{t('step1Sub')}</Text>
              </View>
              <TouchableOpacity onPress={replayCurrentStepVoice} style={styles.stepSpeakerBtn}>
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.wasteGrid}>
              {WASTE_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.wasteCard,
                    selectedWasteType === item.name && styles.wasteCardActive,
                  ]}
                  onPress={() => setSelectedWasteType(item.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.wasteEmoji}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.wasteCardTitle,
                      selectedWasteType === item.name && styles.wasteCardTitleActive,
                    ]}
                  >
                    {getLocalizedWasteName(item)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedWasteType === 'Other Crop Residue' && (
              <TextInput
                style={styles.input}
                placeholder={t('customWastePlaceholder')}
                placeholderTextColor="#A0AEC0"
                value={customWasteType}
                onChangeText={setCustomWasteType}
              />
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 2: QUANTITY & UNIT */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumberBadge}>2</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stepTitle}>{t('step2Title')}</Text>
                <Text style={styles.stepSub}>{t('step2Sub')}</Text>
              </View>
              <TouchableOpacity onPress={replayCurrentStepVoice} style={styles.stepSpeakerBtn}>
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('quantity')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="scale-outline" size={22} color={COLORS.primary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.numericInput}
                placeholder="e.g. 5"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                autoFocus
              />
            </View>

            <Text style={styles.fieldLabel}>{t('unit')}</Text>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {getUnitLabel(u)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 3: EXPECTED PRICE (OPTIONAL) */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumberBadge}>3</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stepTitle}>{t('step3Title')}</Text>
                <Text style={styles.stepSub}>{t('step3Sub')}</Text>
              </View>
              <TouchableOpacity onPress={replayCurrentStepVoice} style={styles.stepSpeakerBtn}>
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.priceHintBanner}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.priceHintText}>
                {t('leaveBlankForBids')}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>{t('pricePerUnit', { unit: getUnitLabel(unit) })}</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.numericInput}
                placeholder="e.g. 2500"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
                value={expectedPrice}
                onChangeText={setExpectedPrice}
              />
            </View>

            <Text style={styles.fieldLabel}>{t('fieldNotesLabel')}</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder={t('fieldNotesPlaceholder')}
              placeholderTextColor="#A0AEC0"
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 4: FARM LOCATION */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumberBadge}>4</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stepTitle}>{t('step4Title')}</Text>
                <Text style={styles.stepSub}>{t('step4Sub')}</Text>
              </View>
              <TouchableOpacity onPress={replayCurrentStepVoice} style={styles.stepSpeakerBtn}>
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={fetchCurrentLocation}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.gpsButtonText}>{t('autoDetectGps')}</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>{t('villageMandalDistrict')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={t('locationPlaceholder')}
                placeholderTextColor="#A0AEC0"
                value={locationText}
                onChangeText={setLocationText}
              />
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 5: PHOTO CAPTURE */}
        {/* ======================================================== */}
        {currentStep === 5 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumberBadge}>5</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stepTitle}>{t('step5Title')}</Text>
                <Text style={styles.stepSub}>{t('step5Sub')}</Text>
              </View>
              <TouchableOpacity onPress={replayCurrentStepVoice} style={styles.stepSpeakerBtn}>
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {imageUri ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.removePhotoText}>{t('removePhoto')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={styles.photoActionCard}
                  onPress={() => pickImage(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={36} color={COLORS.primary} />
                  <Text style={styles.photoActionText}>{t('takePhotoAction')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionCard}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images" size={36} color={COLORS.accent} />
                  <Text style={styles.photoActionText}>{t('galleryAction')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 6: REVIEW & SUBMIT */}
        {/* ======================================================== */}
        {currentStep === 6 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumberBadge}>6</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stepTitle}>{t('step6Title')}</Text>
                <Text style={styles.stepSub}>{t('step6Sub')}</Text>
              </View>
              <TouchableOpacity onPress={replayCurrentStepVoice} style={styles.stepSpeakerBtn}>
                <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.reviewCard, SHADOWS.small]}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t('wasteTypeLabel')}:</Text>
                <Text style={styles.reviewValue}>
                  {selectedWasteType === 'Other Crop Residue'
                    ? (customWasteType || t('otherResidue'))
                    : (WASTE_TYPES.find(w => w.name === selectedWasteType)
                        ? getLocalizedWasteName(WASTE_TYPES.find(w => w.name === selectedWasteType))
                        : selectedWasteType)}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t('quantityLabel')}:</Text>
                <Text style={styles.reviewValue}>{quantity} {getUnitLabel(unit)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t('priceLabel')}:</Text>
                <Text style={styles.reviewValue}>{expectedPrice ? `₹${expectedPrice}/${getUnitLabel(unit)}` : t('openToOffers')}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{t('locationLabel')}:</Text>
                <Text style={styles.reviewValue}>{locationText}</Text>
              </View>
              {imageUri && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.reviewLabel}>{t('attachedPhoto')}</Text>
                  <Image source={{ uri: imageUri }} style={styles.reviewThumb} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Navigation Action Buttons */}
        <View style={styles.navRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backStepBtn} onPress={prevStep}>
              <Ionicons name="arrow-back" size={18} color={COLORS.text} />
              <Text style={styles.backStepBtnText}>{t('prevStepBtn')}</Text>
            </TouchableOpacity>
          )}

          {currentStep < totalSteps ? (
            <Button
              title={t('nextStepBtn')}
              onPress={validateAndNext}
              style={{ flex: 1, marginLeft: currentStep > 1 ? 12 : 0 }}
            />
          ) : (
            <Button
              title={loading ? t('submittingListing') : t('submitWasteListingBtn')}
              onPress={handleSubmit}
              loading={loading}
              style={{ flex: 1, marginLeft: 12 }}
            />
          )}
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
    padding: 16,
    paddingBottom: 40,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  progressDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 36,
  },
  progressDotCompleted: {
    backgroundColor: '#81C784',
  },
  stepBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  stepSub: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stepSpeakerBtn: {
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
  },
  wasteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wasteCard: {
    width: '48%',
    backgroundColor: '#F8FAF8',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  wasteCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  wasteEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  wasteCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  wasteCardTitleActive: {
    color: COLORS.primaryDark,
  },
  wasteCardEn: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  numericInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 8,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  unitChip: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  priceHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  priceHintText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  photoActionCard: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8,
  },
  photoActionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  imagePreviewWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  reviewThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  backStepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 4,
  },
});
