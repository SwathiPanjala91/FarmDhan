import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

export const BuyerMatchingScreen = ({ route, navigation }) => {
  const { user, t } = useAuth();
  const [activeListing, setActiveListing] = useState({
    id: route?.params?.listingId || null,
    wasteType: route?.params?.wasteType || 'Crop Residue',
    quantity: route?.params?.quantity || 0,
    unit: route?.params?.unit || 'ton',
  });

  const [loading, setLoading] = useState(true);
  const [buyers, setBuyers] = useState([]);
  const [weights, setWeights] = useState({
    price: 0.5,
    compatibility: 0.2,
    distance: 0.2,
    quantity: 0.1,
  });

  // Selected buyer for confirmation modal
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchMatchingBuyers = async () => {
    try {
      setLoading(true);
      let currentListingId = activeListing.id;

      // If no listing ID passed in route params, look up the farmer's active listings
      if (!currentListingId) {
        const myListingsRes = await api.listings.getMy();
        if (myListingsRes.success && Array.isArray(myListingsRes.listings) && myListingsRes.listings.length > 0) {
          const firstListing = myListingsRes.listings[0];
          currentListingId = firstListing._id;
          setActiveListing({
            id: firstListing._id,
            wasteType: firstListing.wasteType,
            quantity: firstListing.quantity,
            unit: firstListing.unit || 'ton',
          });
        }
      }

      if (!currentListingId) {
        setBuyers([]);
        setLoading(false);
        return;
      }

      const res = await api.matching.getRecommended(currentListingId);
      if (res.success && Array.isArray(res.recommendedBuyers)) {
        setBuyers(res.recommendedBuyers);
        if (res.weightsConfig) setWeights(res.weightsConfig);
      } else {
        setBuyers([]);
      }
    } catch (err) {
      console.warn('Matching API fetch warning:', err.message);
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchingBuyers();
  }, [route?.params?.listingId]);

  const handleOpenConfirm = (buyer) => {
    setSelectedBuyer(buyer);
    setModalVisible(true);
  };

  const handleConfirmBuyer = async () => {
    if (!selectedBuyer) return;

    setConfirming(true);
    const listingId = activeListing.id || route?.params?.listingId;
    const listingQty = Number(activeListing.quantity) || 1;
    try {
      const payload = {
        listingId,
        buyerId: selectedBuyer.buyerId,
        agreedPrice: selectedBuyer.offeredPrice,
        quantity: listingQty,
        pickupDetails: selectedBuyer.pickupDetails,
      };

      const res = await api.transactions.create(payload);
      setModalVisible(false);

      Alert.alert(
        '🎉 Buyer Confirmed!',
        `You have successfully selected ${selectedBuyer.buyerName}. They have received an instant notification to schedule pickup.`,
        [
          {
            text: 'View Transaction Status',
            onPress: () => navigation.navigate('FarmerTabs'),
          },
        ]
      );
    } catch (err) {
      setModalVisible(false);
      Alert.alert(
        t('error') || 'Failed to Confirm Buyer',
        err?.message || 'An error occurred while confirming the buyer. Please try again.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const renderBuyerCard = ({ item, index }) => {
    const isTopMatch = index === 0;

    return (
      <View style={[styles.buyerCard, isTopMatch && styles.topMatchCard, SHADOWS.small]}>
        {isTopMatch && (
          <View style={styles.topBadge}>
            <Ionicons name="ribbon" size={14} color="#FFFFFF" />
            <Text style={styles.topBadgeText}>{t('bestRecommendation')}</Text>
          </View>
        )}

        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyerName}>{item.buyerName}</Text>
            <Text style={styles.businessType}>{item.businessType}</Text>
          </View>

          {/* Match Score Radial / Pill */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreNumber}>{item.matchScore}%</Text>
            <Text style={styles.scoreLabel}>{t('matchScore')}</Text>
          </View>
        </View>

        {/* Pricing and Distance Overview */}
        <View style={styles.keyMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{t('offeredPrice')}</Text>
            <Text style={styles.metricPrice}>
              ₹{item.offeredPrice.toLocaleString('en-IN')}/{item.unit || 'ton'}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{t('distance')}</Text>
            <Text style={styles.metricVal}>📍 {item.distanceText}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{t('totalPayout')}</Text>
            <Text style={[styles.metricVal, { color: COLORS.primaryDark, fontWeight: '800' }]}>
              ₹{Math.round(item.offeredPrice * (activeListing.quantity || 1)).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Algorithm Score Breakdown Chips */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownTitle}>{t('algoBreakdownTitle')}</Text>
          <View style={styles.factorRow}>
            <View style={styles.factorChip}>
              <Text style={styles.factorText}>{t('algoPriceFactor')} {item.breakdown?.priceScore || 90}%</Text>
            </View>
            <View style={styles.factorChip}>
              <Text style={styles.factorText}>{t('algoDistFactor')} {item.breakdown?.distanceScore || 85}%</Text>
            </View>
            <View style={styles.factorChip}>
              <Text style={styles.factorText}>{t('algoMatchFactor')} {item.breakdown?.compatibilityScore || 100}%</Text>
            </View>
            <View style={styles.factorChip}>
              <Text style={styles.factorText}>{t('algoQtyFactor')} {item.breakdown?.quantityScore || 80}%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.requirementsText}>
          📝 <Text style={{ fontWeight: '700' }}>{t('requirements')}:</Text> {item.requirements}
        </Text>

        {/* Section 13: Choose Buyer Button */}
        <TouchableOpacity
          style={styles.chooseBuyerBtn}
          activeOpacity={0.85}
          onPress={() => handleOpenConfirm(item)}
        >
          <Text style={styles.chooseBuyerText}>{t('chooseBuyerBtn')} →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('recommendedBuyers')}
        subtitle={activeListing.id ? `${activeListing.wasteType} (${activeListing.quantity} ${activeListing.unit})` : 'Matched Biomass Buyers'}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="buyerMatching"
        rightAction={
          <TouchableOpacity
            style={styles.compareNavBtn}
            onPress={() =>
              navigation.navigate('PriceComparison', {
                listingId: activeListing.id,
                wasteType: activeListing.wasteType,
              })
            }
          >
            <Ionicons name="swap-vertical" size={16} color="#FFFFFF" />
            <Text style={styles.compareNavText}>{t('prices')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="buyerMatching" />

      {/* Algorithm Explainer Box */}
      <View style={styles.algorithmBox}>
        <View style={styles.algoHeader}>
          <Ionicons name="bulb-outline" size={18} color={COLORS.primary} />
          <Text style={styles.algoTitle}>{t('algoBoxTitle')}</Text>
        </View>
        <Text style={styles.algoDescription}>
          {t('algoBoxDesc')}
        </Text>
        <Text style={styles.algoNotice}>
          ⚠️ <Text style={{ fontWeight: '700' }}>{t('farmerAutonomyRule')}</Text> {t('farmerAutonomyNotice')}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('locatingBuyers')}</Text>
        </View>
      ) : (
        <FlatList
          data={buyers}
          keyExtractor={(item) => item.buyerId}
          renderItem={renderBuyerCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={54} color={COLORS.border} />
              <Text style={styles.emptyTitle}>{t('noBuyersAvailable')}</Text>
              <Text style={styles.emptySubtitle}>
                {!activeListing.id
                  ? t('noListingsDesc')
                  : t('noBuyersSubtitle')}
              </Text>
              {!activeListing.id && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('ListWasteTab')}
                >
                  <Text style={styles.emptyBtnText}>+ {t('addListing')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Confirmation Modal - Section 13 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={36} color={COLORS.primary} />
              <Text style={styles.modalTitle}>{t('confirmBuyerTitle')}</Text>
            </View>

            <Text style={styles.modalDesc}>{t('confirmBuyerDesc')}</Text>

            {selectedBuyer && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('buyerName')}:</Text>
                  <Text style={styles.summaryValue}>{selectedBuyer.buyerName}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('wasteTypeLabel')}:</Text>
                  <Text style={styles.summaryValue}>{activeListing.wasteType}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('quantity')}:</Text>
                  <Text style={styles.summaryValue}>
                    {activeListing.quantity} {activeListing.unit}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('offeredPrice')}:</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.primary, fontWeight: '800' }]}>
                    ₹{selectedBuyer.offeredPrice}/{activeListing.unit}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('totalAgreedValue')}:</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.primaryDark, fontWeight: '800' }]}>
                    ₹{Math.round(selectedBuyer.offeredPrice * (Number(activeListing.quantity) || 1)).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('distance')}:</Text>
                  <Text style={styles.summaryValue}>{selectedBuyer.distanceText}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('pickupDetailsLabel')}:</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>
                    {selectedBuyer.pickupDetails}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={confirming}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmBuyer}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>{t('confirmBuyerBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  compareNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginLeft: 8,
  },
  compareNavText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  algorithmBox: {
    backgroundColor: '#EDF7ED',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  algoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  algoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginLeft: 6,
  },
  algoDescription: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
  },
  algoNotice: {
    fontSize: 11,
    color: '#1B5E20',
    marginTop: 4,
  },
  buyerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  topMatchCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#FAFDF9',
  },
  topBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  buyerName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  businessType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  scoreLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  keyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  metricPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  breakdownContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  factorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  factorChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  factorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  requirementsText: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 14,
    lineHeight: 18,
  },
  chooseBuyerBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseBuyerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginLeft: 10,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: '55%',
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#EDF2F7',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A5568',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
