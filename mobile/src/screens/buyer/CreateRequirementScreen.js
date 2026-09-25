import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

const AVAILABLE_WASTE_TYPES = [
  'Paddy Straw',
  'Cotton Residue',
  'Wheat Straw',
  'Sugarcane Residue',
  'Maize Residue',
  'Groundnut Residue',
];

export const CreateRequirementScreen = ({ navigation }) => {
  const { profile, t } = useAuth();
  const [selectedTypes, setSelectedTypes] = useState(
    profile?.wasteTypes || ['Paddy Straw']
  );
  const [requiredQty, setRequiredQty] = useState(profile?.requiredQuantity ? String(profile.requiredQuantity) : '');
  const [offeredPrice, setOfferedPrice] = useState(profile?.offeredPrice ? String(profile.offeredPrice) : '');
  const [serviceRadius, setServiceRadius] = useState(profile?.serviceRadius ? String(profile.serviceRadius) : '50');
  const [requirements, setRequirements] = useState(profile?.requirements || '');
  const [loading, setLoading] = useState(false);

  const toggleType = (tType) => {
    if (selectedTypes.includes(tType)) {
      if (selectedTypes.length === 1) {
        Alert.alert(t('error') || 'Required', t('atLeastOneWasteType') || 'Please keep at least one waste type selected.');
        return;
      }
      setSelectedTypes(selectedTypes.filter((x) => x !== tType));
    } else {
      setSelectedTypes([...selectedTypes, tType]);
    }
  };

  const handleSave = async () => {
    if (!offeredPrice || !requiredQty) {
      Alert.alert(t('error') || 'Required', t('enterQtyAndPrice') || 'Please enter required quantity and offered price.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        wasteTypes: selectedTypes,
        requiredQuantity: Number(requiredQty),
        offeredPrice: Number(offeredPrice),
        serviceRadius: Number(serviceRadius) || 50,
        requirements,
      };

      await api.buyers.updateProfile(payload);
      Alert.alert(
        t('procurementSavedSuccess') || 'Saved!',
        t('procurementSavedDesc') || 'Your procurement requirement & offered rate have been updated.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(
        t('error') || 'Error',
        err?.message || t('procurementSaveError') || 'Failed to update procurement terms. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('procurementRequirements') || 'Procurement Requirements'}
        subtitle={t('requirementsSub') || 'Set buyer rate and criteria'}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="createRequirement"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="createRequirement" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>{t('typesOfResiduesPurchased') || 'Types of Residues Purchased'}</Text>
        <Text style={styles.sectionDesc}>{t('typesOfResiduesDesc') || 'Select all crop residues your facility consumes:'}</Text>

        <View style={styles.chipGrid}>
          {AVAILABLE_WASTE_TYPES.map((itemType) => {
            const isSelected = selectedTypes.includes(itemType);
            return (
              <TouchableOpacity
                key={itemType}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => toggleType(itemType)}
              >
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={isSelected ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {itemType}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t('offeredPurchasePrice') || 'Offered Purchase Price (₹ / Ton)'}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2650"
          keyboardType="numeric"
          value={offeredPrice}
          onChangeText={setOfferedPrice}
        />
        <Text style={styles.hint}>
          {t('offeredPriceHint') || 'This price is used by the FarmDhan matching engine to score your offers against farmer listings.'}
        </Text>

        <Text style={styles.label}>{t('targetMonthlyProcurement') || 'Target Monthly Procurement (Tons)'}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 500"
          keyboardType="numeric"
          value={requiredQty}
          onChangeText={setRequiredQty}
        />

        <Text style={styles.label}>{t('maxServiceRadius') || 'Maximum Service Radius (km)'}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 50"
          keyboardType="numeric"
          value={serviceRadius}
          onChangeText={setServiceRadius}
        />

        <Text style={styles.label}>{t('qualityMoistureSpecs') || 'Quality & Moisture Specifications'}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g. Moisture < 15%, square bales preferred, weighbridge check at plant"
          multiline
          value={requirements}
          onChangeText={setRequirements}
        />

        <Button
          title={t('saveProcurementTermsBtn') || 'Save Procurement Requirements'}
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: 24 }}
        />
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
