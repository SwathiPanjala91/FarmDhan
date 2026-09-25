import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { api } from '../../services/api';

const STATUS_FILTERS = ['All', 'pending', 'accepted', 'rejected'];

export const MyOffersScreen = ({ navigation, route }) => {
  const { language, t } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(route?.params?.statusFilter || 'All');

  useEffect(() => {
    if (route?.params?.statusFilter) {
      setStatusFilter(route.params.statusFilter);
    }
  }, [route?.params?.statusFilter]);

  const fetchOffers = async () => {
    try {
      const res = await api.offers.getAll();
      if (res && res.success && Array.isArray(res.offers)) {
        setOffers(res.offers);
        if (route?.params?.offerId) {
          const targetOffer = res.offers.find((o) => o._id === route.params.offerId);
          if (targetOffer) {
            if (statusFilter !== 'All' && statusFilter !== targetOffer.status) {
              setStatusFilter(targetOffer.status);
            }
          } else {
            Alert.alert(
              t('recordNotFound') || 'Offer Unavailable',
              t('detailsUnavailable') || 'The requested offer is no longer available or was removed.'
            );
          }
        }
      } else {
        setOffers([]);
      }
    } catch (err) {
      console.warn('Error fetching buyer offers:', err.message);
      setOffers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const filteredOffers = offers.filter((o) => {
    if (statusFilter === 'All') return true;
    return o.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return {
          label: `🎉 ${t('statusAccepted') || 'Accepted'}`,
          bg: '#DCFCE7',
          color: '#15803D',
        };
      case 'rejected':
        return {
          label: `❌ ${t('statusRejected') || 'Declined'}`,
          bg: '#FEE2E2',
          color: '#B91C1C',
        };
      case 'pending':
      default:
        return {
          label: `⏳ ${t('statusPending') || 'Pending Review'}`,
          bg: '#FEF3C7',
          color: '#B45309',
        };
    }
  };

  const renderOfferCard = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const seller = item.listingId?.farmerId || item.listingId?.sellerId;
    const sellerName = seller?.name || t('verifiedSeller');
    const locationStr =
      [item.listingId?.location?.village, item.listingId?.location?.district].filter(Boolean).join(', ') ||
      t('locationNotProvided');
    const totalEst = (item.offeredPrice || 0) * (item.quantity || 1);
    const isTarget = route?.params?.offerId && item._id === route.params.offerId;

    return (
      <View style={[styles.card, SHADOWS.small, isTarget && { borderColor: COLORS.accent, borderWidth: 2, backgroundColor: '#FFFDF5' }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.residueTitle}>{item.listingId?.wasteType || 'Agricultural Residue'}</Text>
            <Text style={styles.sellerSubtitle}>
              👨‍🌾 {sellerName} • 📍 {locationStr}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Pricing & Qty Matrix */}
        <View style={styles.matrixBox}>
          <View style={styles.matrixItem}>
            <Text style={styles.matrixLabel}>{t('offeredRateLabel') || 'Offered Rate'}</Text>
            <Text style={styles.matrixVal}>₹{item.offeredPrice}/{item.unit || 'ton'}</Text>
          </View>
          <View style={styles.matrixDivider} />
          <View style={styles.matrixItem}>
            <Text style={styles.matrixLabel}>{t('quantityLabel') || 'Quantity'}</Text>
            <Text style={styles.matrixVal}>{item.quantity} {item.unit || 'ton'}</Text>
          </View>
          <View style={styles.matrixDivider} />
          <View style={styles.matrixItem}>
            <Text style={styles.matrixLabel}>{t('totalValueLabel') || 'Total Value'}</Text>
            <Text style={[styles.matrixVal, { color: COLORS.primaryDark }]}>₹{totalEst.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Logistics / Pickup plan */}
        {item.pickupDetails ? (
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={15} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.pickupDetails}
            </Text>
          </View>
        ) : null}

        {/* Action: Contact Seller on Acceptance with strict privacy */}
        {item.status === 'accepted' ? (
          <View style={styles.acceptedContactCard}>
            <View style={styles.contactHeaderRow}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={styles.contactCardTitle}>
                {t('sellerContactDetails')}
              </Text>
            </View>
            <Text style={styles.contactPersonName}>
              👨‍🌾 {sellerName} {locationStr ? `(${locationStr})` : ''}
            </Text>
            {seller?.phone ? (
              <TouchableOpacity
                style={styles.callSellerBtn}
                onPress={() => Linking.openURL(`tel:${seller.phone}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.callSellerBtnText}>
                  {t('callSellerBtn')} (+91 {seller.phone})
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.contactNotice}>
                {t('dealConfirmedSub')}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.privacyNoticeRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.privacyNoticeText}>
              {t('contactHiddenUntilAccepted')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('myPurchaseOffers')}
        subtitle={t('trackBidsSubtitle')}
        showBack={false}
      />
      <VoiceGuideBar screenKey="buyerDashboard" />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f === 'All'
                ? t('allTab')
                : f === 'pending'
                ? t('statusPending')
                : f === 'accepted'
                ? t('statusAccepted')
                : t('statusRejected')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {t('loadingOffers')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOffers}
          keyExtractor={(item) => item._id}
          renderItem={renderOfferCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {t('noOffersFound')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t('browseListingsPrompt')}
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate('BrowseTab')}
              >
                <Ionicons name="search" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.browseBtnText}>
                  {t('browseAvailableListings')}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SIZES.padding,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  residueTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sellerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  matrixBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matrixItem: {
    flex: 1,
    alignItems: 'center',
  },
  matrixDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  matrixLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  matrixVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  acceptedContactCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  contactPersonName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532D',
    marginTop: 2,
    marginBottom: 6,
  },
  contactNotice: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 4,
  },
  callSellerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 6,
  },
  callSellerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  privacyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  privacyNoticeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
