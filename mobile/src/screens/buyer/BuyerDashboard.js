import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { MetricTile } from '../../components/MetricTile';
import { api } from '../../services/api';

export const BuyerDashboard = ({ navigation }) => {
  const { user, profile, logout, t, language } = useAuth();
  const [stats, setStats] = useState({
    newFarmerListingsCount: 0,
    activeOffersCount: 0,
    activeTransactionsCount: 0,
  });
  const [liveListings, setLiveListings] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const statsRes = await api.buyers.getDashboardStats();
      if (statsRes && statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }

      const notifsRes = await api.notifications.getAll();
      if (notifsRes && notifsRes.success) {
        setUnreadNotifsCount(notifsRes.unreadCount || 0);
      }

      const listingsRes = await api.listings.getAll();
      if (listingsRes && listingsRes.success && Array.isArray(listingsRes.listings)) {
        setLiveListings(listingsRes.listings.slice(0, 3));
      }
    } catch (err) {
      console.log('Buyer stats warning:', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('buyerHub') || 'FarmDhan Buyer Hub'}
        subtitle={profile?.businessName || user?.name || t('registeredBuyer') || 'Registered Buyer'}
        unreadNotifs={unreadNotifsCount}
        onNotificationPress={() => navigation.navigate('Notifications')}
        voiceScreenKey="buyerDashboard"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="buyerDashboard" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Buyer Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, SHADOWS.small]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('BuyerProfileTab')}
        >
          <View style={styles.avatar}>
            <Ionicons name="business" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.businessName}>
              {profile?.businessName || user?.name || t('registeredBuyer') || 'Registered Buyer'}
            </Text>
            <Text style={styles.businessType}>
              {profile?.businessType || t('authorizedBuyer') || 'Authorized Buyer'}{profile?.location?.city || user?.location?.district ? ` • 📍 ${profile?.location?.city || user?.location?.district}` : ''}
            </Text>
            {profile?.offeredPrice ? (
              <Text style={styles.currentRate}>
                {t('currentBuyingRate') || 'Current Buying Rate:'} <Text style={{ fontWeight: '800', color: COLORS.primaryDark }}>₹{profile.offeredPrice}/ton</Text>
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* ======================================================== */}
        {/* CORE BUYER SERVICES & AI ASSISTANT                       */}
        {/* ======================================================== */}
        <Text style={styles.sectionHeading}>{t('coreBuyerServices') || 'Core Buyer Services'}</Text>

        {/* 1. PRIMARY HERO CARD: BROWSE FARMER RESIDUE LISTINGS */}
        <TouchableOpacity
          style={[styles.heroActionCard, SHADOWS.medium]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('BrowseTab', { initialTab: 'listings' })}
        >
          <View style={styles.heroIconWrap}>
            <Ionicons name="search" size={32} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>{t('liveSupplyBadge') || 'LIVE SUPPLY'}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('farmerResidueListings') || 'Farmer Residue Listings'}</Text>
            <Text style={styles.heroSubtitle}>
              {t('browseResidueSubtitle') || 'Browse available paddy straw, cotton stalks & sugarcane residue'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 2. AI VOICE & PROCUREMENT ASSISTANT HERO CARD */}
        <TouchableOpacity
          style={[styles.aiHeroCard, SHADOWS.small]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <View style={styles.aiIconCircle}>
            <Ionicons name="mic" size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.aiHeroTitle}>{t('aiBuyerHeroTitle') || '🤖 FarmDhan AI Procurement Assistant'}</Text>
            <Text style={styles.aiHeroSub}>
              {t('aiBuyerHeroSubtitle') || 'Voice assistance for residue prices, biomass logistics & farmer supply'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* 2x2 Action Grid */}
        <View style={styles.actionGrid}>
          {/* MY OFFERS */}
          <TouchableOpacity
            style={[styles.gridActionCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MyOffersTab')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="pricetag" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.gridActionTitle}>{t('myOffers') || 'My Offers'}</Text>
            <Text style={styles.gridActionSub}>
              {t('myOffersSub', { count: stats.activeOffersCount }) || `${stats.activeOffersCount} active bids sent`}
            </Text>
          </TouchableOpacity>

          {/* REQUIREMENTS / PROCUREMENT TERMS */}
          <TouchableOpacity
            style={[styles.gridActionCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RequirementsTab')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="options" size={24} color="#0288D1" />
            </View>
            <Text style={styles.gridActionTitle}>{t('procurementRequirements') || 'Requirements'}</Text>
            <Text style={styles.gridActionSub}>{t('requirementsSub') || 'Update buying rate'}</Text>
          </TouchableOpacity>

          {/* NOTIFICATIONS */}
          <TouchableOpacity
            style={[styles.gridActionCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="notifications" size={24} color={COLORS.error} />
            </View>
            <Text style={styles.gridActionTitle}>{t('notifications') || 'Notifications'}</Text>
            <Text style={styles.gridActionSub}>{unreadNotifsCount} new alerts</Text>
          </TouchableOpacity>

          {/* BUYER PROFILE */}
          <TouchableOpacity
            style={[styles.gridActionCard, SHADOWS.small]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BuyerProfileTab')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="person" size={24} color="#7B1FA2" />
            </View>
            <Text style={styles.gridActionTitle}>{t('buyerProfileDeals') || 'Profile & Deals'}</Text>
            <Text style={styles.gridActionSub}>{t('businessHistory') || 'Business history'}</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* LIVE RESIDUE SUPPLY FEED (REAL ACTIVE LISTINGS)          */}
        {/* ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            {language === 'te' ? 'తాజా పంట వ్యర్థాల సరఫరా' : language === 'hi' ? 'ताजा फसल अवशेष आपूर्ति' : 'Live Residue Supply'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('BrowseTab')}>
            <Text style={styles.seeAllLink}>
              {language === 'te' ? 'అన్నీ చూడండి →' : language === 'hi' ? 'सभी देखें →' : 'See All →'}
            </Text>
          </TouchableOpacity>
        </View>

        {liveListings.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            {liveListings.map((item) => {
              const seller = item.farmerId || item.sellerId;
              const sellerName = seller?.name || (language === 'te' ? 'రైతు / విక్రేత' : language === 'hi' ? 'किसान / विक्रेता' : 'Farmer / Seller');
              const locParts = [item.location?.village, item.location?.district].filter(Boolean);
              const locStr = locParts.length > 0 ? locParts.join(', ') : 'Location not provided';

              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.supplyCard, SHADOWS.small]}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('BrowseTab')}
                >
                  <View style={styles.supplyCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supplyTitle}>{item.wasteType}</Text>
                      <Text style={styles.supplySeller}>👨‍🌾 {sellerName} • 📍 {locStr}</Text>
                    </View>
                    <View style={styles.supplyQtyBadge}>
                      <Text style={styles.supplyQtyText}>{item.quantity} {item.unit || 'ton'}</Text>
                    </View>
                  </View>

                  <View style={styles.supplyBottomRow}>
                    <Text style={styles.supplyPrice}>
                      {item.expectedPrice ? `₹${item.expectedPrice}/${item.unit || 'ton'}` : 'Open to offers'}
                    </Text>
                    <View style={styles.supplyOfferBtn}>
                      <Text style={styles.supplyOfferBtnText}>{t('makeOfferBtn') || 'Make Offer →'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* ======================================================== */}
        {/* PROCUREMENT METRIC TILES (ALL CLICKABLE)                 */}
        {/* ======================================================== */}
        <Text style={styles.sectionHeading}>{t('procurementOverview') || 'Procurement Overview'}</Text>
        <View style={styles.metricsRow}>
          <MetricTile
            label={t('newFarmerResidues') || 'New Farmer Residues'}
            value={stats.newFarmerListingsCount}
            icon="leaf-outline"
            color={COLORS.primary}
            onPress={() => navigation.navigate('BrowseTab', { initialTab: 'listings' })}
          />
          <MetricTile
            label={t('myActiveBids') || 'My Active Bids'}
            value={stats.activeOffersCount}
            icon="pricetag-outline"
            color={COLORS.accent}
            onPress={() => navigation.navigate('MyOffersTab')}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricTile
            label={t('activePickups') || 'Active Pickups'}
            value={stats.activeTransactionsCount}
            icon="car-outline"
            color="#0288D1"
            onPress={() => navigation.navigate('BuyerProfileTab')}
          />
          <MetricTile
            label={t('avgLeadTime') || 'Avg Lead Time'}
            value="36 hrs"
            icon="time-outline"
            color={COLORS.secondary}
            onPress={() => navigation.navigate('MarketInsights')}
          />
        </View>

        {/* Live Market Alert (Clickable) */}
        <TouchableOpacity
          style={[styles.alertCard, SHADOWS.small]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('BrowseTab', { initialTab: 'listings' })}
        >
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.alertTitle}>{t('rabiAlertTitle') || 'Rabi Harvest Arrival Alert'}</Text>
            <Text style={styles.alertText}>
              {t('rabiAlertText') || 'High supply of Paddy Straw available across Warangal & Karimnagar districts. Tap to browse listings and place offers.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Market Insights Link */}
        <TouchableOpacity
          style={styles.insightsBtn}
          onPress={() => navigation.navigate('MarketInsights')}
        >
          <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
          <Text style={styles.insightsBtnText}>{t('regionalAnalyticsBtn') || 'View Regional Market Analytics & Demands'}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  businessType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  currentRate: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 4,
  },

  // Hero Card
  heroActionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTag: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  heroTagText: {
    color: '#713F12',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#E8F5E9',
    marginTop: 2,
    lineHeight: 16,
  },

  // AI Voice Assistant Hero Card
  aiHeroCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  aiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  aiHeroSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },

  // 2x2 Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridActionCard: {
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
  gridActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  gridActionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  metricsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  alertCard: {
    backgroundColor: '#EDF7ED',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  alertText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 2,
    lineHeight: 16,
  },
  insightsBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  insightsBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  supplyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supplyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  supplyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary || '#0F172A',
  },
  supplySeller: {
    fontSize: 12,
    color: COLORS.textSecondary || '#64748B',
    marginTop: 2,
  },
  supplyQtyBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  supplyQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  supplyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  supplyPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark || '#1E3A8A',
  },
  supplyOfferBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  supplyOfferBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
