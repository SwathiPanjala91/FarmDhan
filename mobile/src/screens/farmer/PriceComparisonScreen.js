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
import { api } from '../../services/api';

export const PriceComparisonScreen = ({ route, navigation }) => {
  const { t } = useAuth();
  const [activeListing, setActiveListing] = useState({
    id: route?.params?.listingId || null,
    wasteType: route?.params?.wasteType || 'Crop Residue',
    quantity: route?.params?.quantity || null,
    unit: route?.params?.unit || 'ton',
  });

  const [loading, setLoading] = useState(true);
  const [sortedOffers, setSortedOffers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchPriceComparison = async () => {
    try {
      setLoading(true);
      let currentListingId = activeListing.id;

      // If no listingId was passed in route params, look up the farmer's active listings
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
        setSortedOffers([]);
        setLoading(false);
        return;
      }

      // If listingId was passed without full waste metadata, fetch it from API
      if (currentListingId && (!route?.params?.wasteType || activeListing.wasteType === 'Crop Residue')) {
        try {
          const lRes = await api.listings.getById(currentListingId);
          if (lRes && lRes.success && lRes.listing) {
            setActiveListing({
              id: lRes.listing._id,
              wasteType: lRes.listing.wasteType,
              quantity: lRes.listing.quantity,
              unit: lRes.listing.unit || 'ton',
            });
          } else if (route?.params?.listingId) {
            Alert.alert(
              t('recordNotFound') || 'Listing Unavailable',
              t('detailsUnavailable') || 'The requested listing is no longer available or was removed.'
            );
          }
        } catch (lErr) {
          if (route?.params?.listingId) {
            Alert.alert(
              t('recordNotFound') || 'Listing Unavailable',
              t('detailsUnavailable') || 'The requested listing is no longer available or was removed.'
            );
          }
        }
      }

      const res = await api.matching.getPriceComparison(currentListingId);
      if (res.success && Array.isArray(res.priceComparison)) {
        // Section 12 Specification: Descending price sorting
        // buyers.sort((a, b) => b.price - a.price)
        const sorted = [...res.priceComparison].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        setSortedOffers(sorted);
      } else {
        setSortedOffers([]);
      }
    } catch (err) {
      console.warn('Price comparison fetch warning:', err.message);
      setSortedOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceComparison();
  }, [route?.params?.listingId]);

  const handleOpenConfirm = (buyer) => {
    setSelectedBuyer(buyer);
    setModalVisible(true);
  };

  const handleConfirmBuyer = async () => {
    if (!selectedBuyer) return;
    setConfirming(true);
    const listingQty = Number(activeListing?.quantity) || 1;
    const listingUnit = activeListing?.unit || 'ton';
    try {
      await api.transactions.create({
        listingId: activeListing.id || route?.params?.listingId,
        buyerId: selectedBuyer.buyerId,
        agreedPrice: selectedBuyer.price,
        quantity: listingQty,
        pickupDetails: selectedBuyer.pickupDetails,
      });
      setModalVisible(false);
      Alert.alert(
        '🎉 Buyer Selected!',
        `You have confirmed ${selectedBuyer.buyerName} at ₹${selectedBuyer.price}/${listingUnit}. The buyer has been notified to schedule pickup.`,
        [{ text: 'View Dashboard', onPress: () => navigation.navigate('FarmerTabs') }]
      );
    } catch (err) {
      setModalVisible(false);
      Alert.alert(
        t('error') || 'Failed to Confirm Deal',
        err?.message || 'An error occurred while confirming the buyer. Please try again.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const renderComparisonRow = ({ item, index }) => {
    const isHighest = index === 0;
    const listingQty = Number(activeListing?.quantity) || 1;
    const listingUnit = activeListing?.unit || 'ton';

    return (
      <View style={[styles.card, isHighest && styles.highestCard, SHADOWS.small]}>
        {isHighest && (
          <View style={styles.highestBadge}>
            <Ionicons name="trophy" size={14} color="#FFFFFF" />
            <Text style={styles.highestBadgeText}>{t('highestPriceOffer')}</Text>
          </View>
        )}

        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyerName}>{item.buyerName}</Text>
            <Text style={styles.businessType}>{item.businessType}</Text>
          </View>
          <View style={styles.priceWrap}>
            <Text style={styles.priceVal}>
              ₹{item.price.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.unitText}>{t('perUnit', { unit: item.unit || 'ton' })}</Text>
          </View>
        </View>

        {/* Comparison Specs Table */}
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.colLabel}>{t('distance')}</Text>
            <Text style={styles.colVal}>📍 {item.distanceText}</Text>
          </View>
          <View style={styles.colDivider} />
          <View style={styles.tableCol}>
            <Text style={styles.colLabel}>{t('algorithmScore')}</Text>
            <Text style={[styles.colVal, { color: COLORS.primary }]}>
              {t('matchPercent', { score: item.matchScore })}
            </Text>
          </View>
          <View style={styles.colDivider} />
          <View style={styles.tableCol}>
            <Text style={styles.colLabel}>
              {t('total')} ({activeListing?.quantity ? `${listingQty}${listingUnit === 'ton' ? 't' : ` ${listingUnit}`}` : 'Unit'})
            </Text>
            <Text style={[styles.colVal, { color: COLORS.primaryDark, fontWeight: '800' }]}>
              ₹{Math.round(item.price * listingQty).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <Text style={styles.pickupNote}>
          🚛 <Text style={{ fontWeight: '700' }}>{t('logistics')}</Text> {item.pickupDetails}
        </Text>

        <TouchableOpacity
          style={[styles.chooseBtn, isHighest && styles.chooseBtnHighest]}
          activeOpacity={0.8}
          onPress={() => handleOpenConfirm(item)}
        >
          <Text style={styles.chooseBtnText}>{t('chooseBuyerBtn')} (₹{item.price})</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('priceComparison')}
        subtitle={activeListing.wasteType}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="priceComparison"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="priceComparison" />

      {/* Sorting Algorithm Explainer - Section 12 */}
      <View style={styles.infoBanner}>
        <Ionicons name="filter" size={18} color={COLORS.accent} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.infoTitle}>
            {t('priceSortTitle')}
          </Text>
          <Text style={styles.infoSubtitle}>
            {t('priceSortSubtitle')}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('fetchingOffers')}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOffers}
          keyExtractor={(item, idx) => item.buyerId || String(idx)}
          renderItem={renderComparisonRow}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={54} color={COLORS.border} />
              <Text style={styles.emptyTitle}>{t('noOffersYet')}</Text>
              <Text style={styles.emptySubtitle}>
                {!activeListing.id
                  ? t('noOffersEmptyListingSubtitle')
                  : t('noOffersSubtitle')}
              </Text>
              {!activeListing.id && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('ListWasteTab')}
                >
                  <Text style={styles.emptyBtnText}>{t('createWasteListingBtn')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Choose Buyer Confirmation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('confirmBuyerTitle')}</Text>
            <Text style={styles.modalDesc}>{t('confirmBuyerDesc')}</Text>

            {selectedBuyer && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('buyer')}</Text>
                  <Text style={styles.summaryVal}>{selectedBuyer.buyerName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('offeredPrice')}:</Text>
                  <Text style={[styles.summaryVal, { color: COLORS.primary, fontWeight: '800' }]}>
                    ₹{selectedBuyer.price}/ton
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('distance')}:</Text>
                  <Text style={styles.summaryVal}>{selectedBuyer.distanceText}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('pickup')}</Text>
                  <Text style={styles.summaryVal}>{selectedBuyer.pickupDetails}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={confirming}
              >
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmBuyer}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmText}>{t('confirmBuyerBtn')}</Text>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B78103',
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#6B5403',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  highestCard: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: '#FFFDF9',
  },
  highestBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highestBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  businessType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  unitText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 12,
    alignItems: 'center',
  },
  tableCol: {
    flex: 1,
    alignItems: 'center',
  },
  colDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  colLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  colVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  pickupNote: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 12,
  },
  chooseBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  chooseBtnHighest: {
    backgroundColor: COLORS.primaryDark,
  },
  chooseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelText: {
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
    color: '#FFFFFF',
    fontWeight: '800',
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
