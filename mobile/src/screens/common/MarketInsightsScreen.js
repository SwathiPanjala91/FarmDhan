import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { api } from '../../services/api';

export const MarketInsightsScreen = ({ navigation }) => {
  const { t } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const res = await api.insights.getMarketInsights();
        if (res.success) {
          setInsights(res);
        }
      } catch (err) {
        console.warn('Insights error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('marketInsightsTitle')}
        subtitle={t('marketInsightsSubtitle')}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="marketInsights"
      />

      {/* Multilingual Voice Guidance */}
      <VoiceGuideBar screenKey="marketInsights" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Section 23 Rule: Strict distinction alert */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.disclaimerTitle}>{t('transparencyGuarantee')}</Text>
            <Text style={styles.disclaimerText}>
              {t('transparencyText')}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : (
          <>
            {/* 1. ACTUAL LIVE PLATFORM DATA */}
            <Text style={styles.sectionHeader}>{t('livePlatformData')}</Text>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, SHADOWS.small]}>
                <Text style={styles.metricVal}>
                  {insights?.livePlatformData?.totalListings ?? 0}
                </Text>
                <Text style={styles.metricLabel}>{t('totalResidueListings')}</Text>
              </View>

              <View style={[styles.metricCard, SHADOWS.small]}>
                <Text style={[styles.metricVal, { color: COLORS.accent }]}>
                  {insights?.livePlatformData?.totalRegisteredBuyers ?? 0}
                </Text>
                <Text style={styles.metricLabel}>{t('verifiedBuyersCount')}</Text>
              </View>

              <View style={[styles.metricCard, SHADOWS.small]}>
                <Text style={[styles.metricVal, { color: COLORS.secondary }]}>
                  {insights?.livePlatformData?.completedTransactions ?? 0}
                </Text>
                <Text style={styles.metricLabel}>{t('transactionsExecuted')}</Text>
              </View>

              <View style={[styles.metricCard, SHADOWS.small]}>
                <Text style={[styles.metricVal, { color: '#0288D1' }]}>
                  {insights?.livePlatformData?.totalVolumeTons ? `${insights.livePlatformData.totalVolumeTons}t` : '0t'}
                </Text>
                <Text style={styles.metricLabel}>{t('totalBiomassVolume')}</Text>
              </View>
            </View>

            {/* 2. REGIONAL REFERENCE BENCHMARKS */}
            <Text style={styles.sectionHeader}>📈 Agricultural Price Benchmarks</Text>
            <Text style={styles.sectionSub}>
              Standard market reference values across Telangana & Andhra Pradesh biomass facilities:
            </Text>

            {(insights?.regionalReferenceBenchmarks || [
              {
                wasteType: 'Paddy Straw',
                benchmarkPricePerTon: 2350,
                demandLevel: 'High',
                keyIndustries: ['Pellet Plants', 'Bio-CNG', 'Mushroom Cultivation'],
                moistureStandard: '< 15%',
              },
              {
                wasteType: 'Cotton Stalks',
                benchmarkPricePerTon: 2800,
                demandLevel: 'High',
                keyIndustries: ['Briquette Manufacturers', 'Thermal Co-firing'],
                moistureStandard: '< 12%',
              },
              {
                wasteType: 'Sugarcane Bagasse',
                benchmarkPricePerTon: 2450,
                demandLevel: 'Medium',
                keyIndustries: ['Paper Mills', 'Cogeneration'],
                moistureStandard: '< 45%',
              },
              {
                wasteType: 'Wheat Straw',
                benchmarkPricePerTon: 2600,
                demandLevel: 'High',
                keyIndustries: ['Animal Feed', 'Pelletization'],
                moistureStandard: '< 14%',
              },
            ]).map((item, idx) => (
              <View key={idx} style={[styles.benchmarkCard, SHADOWS.small]}>
                <View style={styles.bmHeader}>
                  <View>
                    <Text style={styles.bmWaste}>{item.wasteType}</Text>
                    <Text style={styles.bmMoisture}>Std Moisture: {item.moistureStandard}</Text>
                  </View>
                  <View style={styles.bmPriceWrap}>
                    <Text style={styles.bmPrice}>₹{item.benchmarkPricePerTon.toLocaleString('en-IN')}</Text>
                    <Text style={styles.bmUnit}>/ ton benchmark</Text>
                  </View>
                </View>

                <View style={styles.demandRow}>
                  <View style={styles.demandPill}>
                    <Text style={styles.demandText}>Demand: {item.demandLevel}</Text>
                  </View>
                </View>

                <Text style={styles.industryTitle}>Primary Industrial Applications:</Text>
                <View style={styles.tagWrap}>
                  {item.keyIndustries?.map((ind, iIdx) => (
                    <View key={iIdx} style={styles.tag}>
                      <Text style={styles.tagText}>{ind}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
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
    paddingBottom: 32,
  },
  disclaimerCard: {
    backgroundColor: '#EDF7ED',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: COLORS.card,
    width: '48%',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  benchmarkCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bmWaste: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  bmMoisture: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  bmPriceWrap: {
    alignItems: 'flex-end',
  },
  bmPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  bmUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  demandRow: {
    marginTop: 8,
  },
  demandPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  demandText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  industryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 6,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#334155',
  },
  center: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
  },
});
