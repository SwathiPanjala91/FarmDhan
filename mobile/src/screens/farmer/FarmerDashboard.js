import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { FarmerAvatar } from '../../components/FarmerAvatar';
import { api } from '../../services/api';

export const FarmerDashboard = ({ navigation }) => {
  const { user, t, language } = useAuth();
  const [stats, setStats] = useState({
    activeListingsCount: 0,
    availableBuyersCount: 0,
    latestOffersCount: 0,
    topRate: null,
  });
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Stats
      const statsRes = await api.matching.getFarmerStats();
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }

      // 2. Fetch Live Unread Notifications
      const notifRes = await api.notifications.getAll();
      if (notifRes.success) {
        setUnreadNotifsCount(notifRes.unreadCount || 0);
      }
    } catch (err) {
      console.log('Dashboard fetch warning:', err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const callHelpline = () => {
    Linking.openURL('tel:18004251551');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('appTitle')}
        subtitle={user?.name ? `${user.name}${user.location?.village ? ` (${user.location.village})` : ''}` : 'Farmer Dashboard'}
        unreadNotifs={unreadNotifsCount}
        onNotificationPress={() => navigation.navigate('Notifications')}
        voiceScreenKey="farmerDashboard"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="farmerDashboard" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* ======================================================== */}
        {/* REQUIREMENT 6: PROMINENT AI ASSISTANT (VISIBLE IMMEDIATELY) */}
        {/* ======================================================== */}
        <View style={[styles.aiHeroCard, SHADOWS.medium]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FarmerAvatar size="medium" state="idle" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                <Text style={styles.aiBadgeText}>{t('aiAssistant')}</Text>
              </View>
              <Text style={styles.aiHeroTitle}>{t('aiHeroTitle')}</Text>
              <Text style={styles.aiHeroSubtitle}>{t('aiHeroSubtitle')}</Text>
            </View>
          </View>

          {/* Large Tap to Speak Voice Button */}
          <TouchableOpacity
            style={styles.speakButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AITab', { newChat: true })}
          >
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.speakButtonText}>{t('tapToSpeakHero')}</Text>
          </TouchableOpacity>

          {/* Quick AI Action Pills */}
          <View style={styles.quickPillsRow}>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => navigation.navigate('ListWasteTab')}
            >
              <Text style={styles.pillText}>{t('sellMyWastePill')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => navigation.navigate('NearbyBuyers')}
            >
              <Text style={styles.pillText}>{t('findBuyersPill')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => navigation.navigate('PricesTab')}
            >
              <Text style={styles.pillText}>{t('checkOffersPill')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => navigation.navigate('AITab', { newChat: true })}
            >
              <Text style={styles.pillText}>{t('helpMePill')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================================== */}
        {/* REQUIREMENT 7: 5 CORE FARMER ACTIONS (LARGE & CLEAR)     */}
        {/* Sell Waste | Find Buyers | My Listings | My Offers | Ask */}
        {/* ======================================================== */}
        <Text style={styles.sectionTitle}>{t('mainFarmerServices')}</Text>

        {/* 1. SELL WASTE (HERO PRIMARY ACTION) */}
        <TouchableOpacity
          style={[styles.heroActionCard, SHADOWS.medium]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ListWasteTab')}
        >
          <View style={styles.heroActionIcon}>
            <Ionicons name="add-circle" size={36} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.heroActionTag}>
              <Text style={styles.heroActionTagText}>{t('postNewListing')}</Text>
            </View>
            <Text style={styles.heroActionTitle}>{t('sellCropWaste')}</Text>
            <Text style={styles.heroActionDesc}>{t('sellCropWasteDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 2x2 Clean Action Grid: Find Buyers, My Listings, My Offers, Ask FarmDhan */}
        <View style={styles.actionGrid}>
          {/* FIND BUYERS */}
          <TouchableOpacity
            style={[styles.gridCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('NearbyBuyers')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="map" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.gridCardTitle}>{t('findBuyersAction')}</Text>
            <Text style={styles.gridCardSub}>{t('findBuyersDesc')}</Text>
          </TouchableOpacity>

          {/* MY LISTINGS */}
          <TouchableOpacity
            style={[styles.gridCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MyListings')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="leaf" size={24} color="#0288D1" />
            </View>
            <Text style={styles.gridCardTitle}>{t('myListings')}</Text>
            <Text style={styles.gridCardSub}>{t('myListingsDesc')}</Text>
          </TouchableOpacity>

          {/* MY OFFERS / PRICE COMPARISON */}
          <TouchableOpacity
            style={[styles.gridCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PricesTab')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="swap-vertical" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.gridCardTitle}>{t('myOffers')}</Text>
            <Text style={styles.gridCardSub}>{t('myOffersDesc')}</Text>
          </TouchableOpacity>

          {/* ASK FARMDHAN */}
          <TouchableOpacity
            style={[styles.gridCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AITab', { newChat: true })}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="chatbubbles" size={24} color="#7B1FA2" />
            </View>
            <Text style={styles.gridCardTitle}>{t('askFarmdhan')}</Text>
            <Text style={styles.gridCardSub}>{t('askFarmdhanDesc')}</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* REQUIREMENT 2: CLICKABLE DASHBOARD STATS STRIP           */}
        {/* ======================================================== */}
        <Text style={styles.sectionTitle}>{t('marketSummary')}</Text>
        <View style={styles.statsStrip}>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MyListings')}
          >
            <Text style={styles.statNumber}>{stats.activeListingsCount}</Text>
            <Text style={styles.statLabel}>{t('activeListings')}</Text>
            <Text style={styles.statTapHint}>{t('viewMore')}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('NearbyBuyers')}
          >
            <Text style={[styles.statNumber, { color: COLORS.accent }]}>{stats.availableBuyersCount}</Text>
            <Text style={styles.statLabel}>{t('verifiedBuyers')}</Text>
            <Text style={styles.statTapHint}>{t('explore')}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('PricesTab')}
          >
            <Text style={[styles.statNumber, { color: '#0288D1' }]}>
              {stats.topRate ? `₹${stats.topRate.toLocaleString('en-IN')}` : '—'}
            </Text>
            <Text style={styles.statLabel}>{t('topRatePerTon')}</Text>
            <Text style={styles.statTapHint}>{t('rates')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links Row: FPO Network & Market Analytics */}
        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('Support')}
          >
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.quickLinkText}>{t('fpoCenters')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('MarketInsights')}
          >
            <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
            <Text style={styles.quickLinkText}>{t('marketDemand')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={20} color={COLORS.primary} />
            <Text style={styles.quickLinkText}>{t('alerts')} ({unreadNotifsCount})</Text>
          </TouchableOpacity>
        </View>

        {/* Direct Toll-Free Kisan Helpline Button */}
        <TouchableOpacity style={styles.helplineBtn} onPress={callHelpline} activeOpacity={0.85}>
          <View style={styles.helplineIconWrap}>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.helplineTitle}>{t('kisanCallCenter')}</Text>
            <Text style={styles.helplinePhone}>{t('tapToCallFree')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    padding: 16,
    paddingBottom: 36,
  },

  // AI Assistant Hero
  aiHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#D1E7DD',
  },
  aiHeroHeader: {
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B1FA2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  aiHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  aiHeroSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  speakButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  micCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  speakButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 4,
  },

  // Hero Sell Waste Card
  heroActionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroActionTag: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  heroActionTagText: {
    color: '#713F12',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroActionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroActionDesc: {
    fontSize: 12,
    color: '#E8F5E9',
    marginTop: 2,
    lineHeight: 16,
  },

  // 2x2 Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  gridCardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statTapHint: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },

  // Quick Links
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickLink: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },

  // Helpline
  helplineBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  helplineIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helplineTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  helplinePhone: {
    color: '#C8E6C9',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});
