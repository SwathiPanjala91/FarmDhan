import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { api } from '../../services/api';

const CROP_FILTERS = ['All', 'Paddy Straw', 'Cotton Residue', 'Sugarcane Residue', 'Wheat Straw'];

export const BrowseListingsScreen = ({ navigation, route }) => {
  const { user, t } = useAuth();
  const [activeTab, setActiveTab] = useState(
    route?.params?.initialTab === 'offers' ? 'offers' : 'listings'
  );

  // Listings State
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Offers State
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Offer Form State
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [pickupDetails, setPickupDetails] = useState('Buyer arranged commercial truck within 48 hours');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync tab if route params change
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === 'offers' ? 'offers' : 'listings');
    }
  }, [route?.params?.initialTab]);

  // If a listingId was passed from notification or deep link, fetch real listing & open details modal
  useEffect(() => {
    const targetListingId = route?.params?.listingId;
    if (targetListingId) {
      let isMounted = true;
      (async () => {
        try {
          const res = await api.listings.getById(targetListingId);
          if (isMounted && res && res.success && res.listing) {
            setSelectedListing(res.listing);
            setDetailModalVisible(true);
          } else if (isMounted) {
            Alert.alert(
              t('recordNotFound') || 'Listing Unavailable',
              t('detailsUnavailable') || 'The requested listing is no longer available or was removed.'
            );
          }
        } catch (err) {
          if (isMounted) {
            Alert.alert(
              t('recordNotFound') || 'Listing Unavailable',
              t('detailsUnavailable') || 'The requested listing is no longer available or was removed.'
            );
          }
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [route?.params?.listingId]);

  const fetchListings = async () => {
    try {
      setLoadingListings(true);
      const res = await api.listings.getAll(selectedCrop !== 'All' ? `wasteType=${selectedCrop}` : '');
      if (res && res.success && Array.isArray(res.listings)) {
        setListings(res.listings);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.warn('Error browsing listings:', err.message);
      setListings([]);
    } finally {
      setLoadingListings(false);
      setRefreshing(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const res = await api.offers.getAll();
      if (res && res.success && Array.isArray(res.offers)) {
        setOffers(res.offers);
      } else {
        setOffers([]);
      }
    } catch (err) {
      console.warn('Error fetching buyer offers:', err.message);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchListings();
      fetchOffers();
    }, [selectedCrop])
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'listings') {
      fetchListings();
    } else {
      fetchOffers();
    }
  };

  const filteredListings = listings.filter((item) => {
    const matchesCrop =
      selectedCrop === 'All' ||
      item.wasteType?.toLowerCase().includes(selectedCrop.toLowerCase());

    if (!matchesCrop) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      item.wasteType?.toLowerCase().includes(q) ||
      item.farmerId?.name?.toLowerCase().includes(q) ||
      item.location?.village?.toLowerCase().includes(q) ||
      item.location?.district?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      String(item.expectedPrice || '').includes(q)
    );
  });

  const handleOpenOfferModal = (listing) => {
    setSelectedListing(listing);
    setOfferPrice(String(listing.expectedPrice || ''));
    setOfferQuantity(String(listing.quantity || ''));
    setOfferModalVisible(true);
  };

  const handleOpenDetailModal = (listing) => {
    setSelectedListing(listing);
    setDetailModalVisible(true);
  };

  const handleSendOffer = async () => {
    if (!offerPrice || isNaN(offerPrice) || Number(offerPrice) <= 0) {
      Alert.alert(t('error') || 'Invalid Price', 'Please enter a valid offered price per ton/unit.');
      return;
    }
    if (!offerQuantity || isNaN(offerQuantity) || Number(offerQuantity) <= 0) {
      Alert.alert(t('error') || 'Invalid Quantity', 'Please enter a valid purchase quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        listingId: selectedListing._id,
        offeredPrice: Number(offerPrice),
        quantity: Number(offerQuantity),
        pickupDetails,
        message: offerMessage,
      };

      const res = await api.offers.create(payload);
      setOfferModalVisible(false);
      Alert.alert(
        t('offerSentSuccess') || 'Offer Sent to Farmer! 🎉',
        t('offerSentSuccessDesc', {
          price: offerPrice,
          unit: selectedListing.unit || 'ton',
          farmerName: selectedListing.farmerId?.name || 'Farmer',
        }) || `Your bid of ₹${offerPrice}/${selectedListing.unit || 'ton'} has been sent to ${selectedListing.farmerId?.name || 'the farmer'}. You will be notified when they accept.`,
        [{ text: 'OK' }]
      );
      // Refresh offers list
      fetchOffers();
    } catch (err) {
      setOfferModalVisible(false);
      Alert.alert(
        t('offerErrorTitle') || 'Could Not Submit Offer',
        err?.message || 'Failed to submit offer to farmer. Please check your network and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderListingItem = ({ item }) => {
    const seller = item.farmerId || item.sellerId;
    const sellerName = seller?.name || (language === 'te' ? 'రైతు / విక్రేత' : language === 'hi' ? 'किसान / विक्रेता' : 'Farmer / Seller');
    const locationParts = [item.location?.village, item.location?.district].filter(Boolean);
    const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : 'Location not provided';

    return (
      <View style={[styles.card, SHADOWS.small]}>
        {/* Top Product Header Row with Badge and Quantity */}
        <View style={styles.cardTopRow}>
          <View style={styles.productBadge}>
            <Ionicons name="leaf" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.productBadgeText}>{item.wasteType || 'Crop Residue'}</Text>
          </View>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText}>
              {item.quantity} {item.unit || 'ton'}
            </Text>
          </View>
        </View>

        {/* Key Info Details */}
        <View style={styles.cardInfoSection}>
          <View style={styles.cardInfoRow}>
            <Ionicons name="person" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.sellerNameText}>
              {sellerName}
            </Text>
          </View>

          <View style={styles.cardInfoRow}>
            <Ionicons name="location" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.locationText} numberOfLines={1}>
              📍 {locationDisplay}
            </Text>
          </View>

          {item.description ? (
            <Text style={styles.descText} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>

        {/* Pricing & Action Row */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>{t('farmerExpectedRate') || 'Expected Price'}</Text>
            <Text style={styles.priceVal}>
              {item.expectedPrice ? `₹${item.expectedPrice}/${item.unit || 'ton'}` : t('openToOffers') || 'Open to offers'}
            </Text>
          </View>

          <View style={styles.cardActionsGroup}>
            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() => handleOpenDetailModal(item)}
            >
              <Text style={styles.viewDetailsBtnText}>{t('viewDetailsBtn') || 'Details'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.makeOfferBtn}
              onPress={() => handleOpenOfferModal(item)}
            >
              <Ionicons name="send" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.makeOfferBtnText}>{t('makeOfferBtn') || 'Make Offer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderOfferItem = ({ item }) => {
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    const isRejected = item.status === 'rejected';

    return (
      <View style={[styles.card, SHADOWS.small]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.wasteType}>{item.listingId?.wasteType || 'Crop Residue'}</Text>
            <Text style={styles.farmerName}>
              🌾 {item.listingId?.farmerId?.name || 'Farmer'} • 📍 {item.listingId?.location?.village || item.listingId?.location?.district || 'Telangana'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isAccepted && styles.statusBadgeAccepted,
              isRejected && styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isAccepted && styles.statusBadgeTextAccepted,
                isRejected && styles.statusBadgeTextRejected,
              ]}
            >
              {isAccepted
                ? t('offerStatusAccepted') || '🎉 Offer Accepted'
                : isRejected
                ? t('offerStatusRejected') || '❌ Offer Declined'
                : t('offerStatusPending') || '⏳ Pending Review'}
            </Text>
          </View>
        </View>

        <View style={styles.offerDetailsBox}>
          <View style={styles.offerDetailRow}>
            <Text style={styles.offerDetailLabel}>{t('offeredRateLabel') || 'Your Offered Rate:'}</Text>
            <Text style={styles.offerDetailValue}>₹{item.offeredPrice} / {item.unit || 'ton'}</Text>
          </View>
          <View style={styles.offerDetailRow}>
            <Text style={styles.offerDetailLabel}>Quantity Offered:</Text>
            <Text style={styles.offerDetailValue}>{item.quantity} {item.unit || 'ton'}</Text>
          </View>
          {item.pickupDetails ? (
            <View style={styles.offerDetailRow}>
              <Text style={styles.offerDetailLabel}>{t('pickupStatusLabel') || 'Pickup Plan:'}</Text>
              <Text style={[styles.offerDetailValue, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                {item.pickupDetails}
              </Text>
            </View>
          ) : null}
        </View>

        {isAccepted && (
          <TouchableOpacity
            style={styles.contactFarmerBtn}
            onPress={() => {
              const phone = item.listingId?.farmerId?.phone;
              if (phone) {
                Linking.openURL(`tel:${phone}`);
              } else {
                Alert.alert('Deal Confirmed', 'The farmer accepted your offer. Check your Notifications or Deals tab for coordination.');
              }
            }}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.contactFarmerBtnText}>{t('coordinatePickupBtn') || '📞 Contact Farmer for Pickup'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('farmerResidueListings') || 'Farmer Residue Listings'}
        subtitle={activeTab === 'listings' ? 'Live crop waste supply' : 'Track your active & accepted offers'}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="browseListings"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="browseListings" />

      {/* SEGMENTED CONTROL TABS */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'listings' && styles.segmentTabActive]}
          onPress={() => setActiveTab('listings')}
        >
          <Ionicons
            name="leaf"
            size={16}
            color={activeTab === 'listings' ? COLORS.primary : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, activeTab === 'listings' && styles.segmentTextActive]}>
            {t('availableResiduesTab') || 'Farmer Listings'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'offers' && styles.segmentTabActive]}
          onPress={() => {
            setActiveTab('offers');
            fetchOffers();
          }}
        >
          <Ionicons
            name="pricetag"
            size={16}
            color={activeTab === 'offers' ? COLORS.accent : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, activeTab === 'offers' && styles.segmentTextActive]}>
            {t('myBidsTab') || 'My Offers & Bids'}
          </Text>
          {offers.length > 0 && (
            <View style={styles.offerBadgeCount}>
              <Text style={styles.offerBadgeCountText}>{offers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'listings' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchResiduesPlaceholder') || 'Search crop, farmer, village, or district...'}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Row */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CROP_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, selectedCrop === f && styles.chipActive]}
                  onPress={() => setSelectedCrop(f)}
                >
                  <Text style={[styles.chipText, selectedCrop === f && styles.chipTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loadingListings && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Fetching active farmer listings...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredListings}
              keyExtractor={(item) => item._id}
              renderItem={renderListingItem}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={56} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>
                    {searchQuery
                      ? `No listings match "${searchQuery}"`
                      : t('noResiduesFound') || 'No crop residues available'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try searching with a different term or reset your filters.'
                      : t('noResiduesFoundDesc') || 'Active farmer listings will appear here.'}
                  </Text>
                  {(searchQuery !== '' || selectedCrop !== 'All') && (
                    <TouchableOpacity
                      style={styles.resetFiltersBtn}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCrop('All');
                      }}
                    >
                      <Text style={styles.resetFiltersBtnText}>
                        {t('resetFiltersBtn') || 'Reset Search & Filters'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          )}
        </>
      ) : (
        /* MY OFFERS TAB */
        <>
          {loadingOffers && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Loading your submitted offers...</Text>
            </View>
          ) : (
            <FlatList
              data={offers}
              keyExtractor={(item) => item._id}
              renderItem={renderOfferItem}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="pricetag-outline" size={56} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>{t('noOffersSubmitted') || 'No Offers Submitted Yet'}</Text>
                  <Text style={styles.emptySubtitle}>
                    {t('noOffersSubmittedDesc') ||
                      'Browse farmer residue listings and submit your first purchase offer.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.resetFiltersBtn, { backgroundColor: COLORS.accent }]}
                    onPress={() => setActiveTab('listings')}
                  >
                    <Text style={styles.resetFiltersBtnText}>Browse Residue Listings</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      )}

      {/* MAKE OFFER MODAL */}
      <Modal visible={offerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="pricetag" size={28} color={COLORS.primary} />
              <Text style={styles.modalTitle}>{t('submitOfferTitle') || 'Submit Offer to Farmer'}</Text>
            </View>

            {selectedListing && (
              <Text style={styles.modalSubtitle}>
                Listing: {selectedListing.quantity} {selectedListing.unit || 'ton'} of {selectedListing.wasteType} from {selectedListing.farmerId?.name || 'Farmer'}
              </Text>
            )}

            <Text style={styles.label}>
              {t('offeredPriceLabel', { unit: selectedListing?.unit || 'ton' }) || `Your Offered Price (₹ / ${selectedListing?.unit || 'ton'})`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('offeredPricePlaceholder') || 'e.g. 2650'}
              keyboardType="numeric"
              value={offerPrice}
              onChangeText={setOfferPrice}
            />

            <Text style={styles.label}>
              {t('quantityToPurchaseLabel', { unit: selectedListing?.unit || 'ton' }) || `Quantity to Purchase (${selectedListing?.unit || 'ton'})`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('quantityPlaceholder') || 'Enter quantity'}
              keyboardType="numeric"
              value={offerQuantity}
              onChangeText={setOfferQuantity}
            />

            <Text style={styles.label}>{t('pickupLogisticsLabel') || 'Pickup & Logistics Plan'}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('pickupLogisticsPlaceholder') || 'e.g. Arranged commercial truck within 48 hours'}
              value={pickupDetails}
              onChangeText={setPickupDetails}
            />

            <Text style={styles.label}>{t('messageToFarmerLabel') || 'Message to Farmer (Optional)'}</Text>
            <TextInput
              style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
              placeholder={t('messageToFarmerPlaceholder') || 'Optional message (e.g. Immediate digital payment on weighment)'}
              multiline
              value={offerMessage}
              onChangeText={setOfferMessage}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setOfferModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitOfferBtn}
                onPress={handleSendOffer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitOfferText}>{t('sendOfferBtn') || 'Send Offer to Farmer →'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={detailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={26} color={COLORS.primary} />
              <Text style={styles.modalTitle}>{t('listingDetailTitle') || 'Residue Listing Details'}</Text>
            </View>

            {selectedListing && (
              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Residue Type:</Text>
                  <Text style={styles.detailValue}>{selectedListing.wasteType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Available Supply:</Text>
                  <Text style={styles.detailValue}>{selectedListing.quantity} {selectedListing.unit || 'ton'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('farmerExpectedRate') || 'Farmer Rate:'}</Text>
                  <Text style={styles.detailValue}>
                    {selectedListing.expectedPrice ? `₹${selectedListing.expectedPrice}/${selectedListing.unit || 'ton'}` : 'Open to offers'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>
                    📍 {[selectedListing.location?.village, selectedListing.location?.district].filter(Boolean).join(', ') || 'Location not provided'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seller Name:</Text>
                  <Text style={styles.detailValue}>
                    👨‍🌾 {selectedListing.farmerId?.name || selectedListing.sellerId?.name || 'Verified Seller'}
                  </Text>
                </View>
                {selectedListing.description ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.detailLabel}>Description & Notes:</Text>
                    <Text style={[styles.descText, { marginTop: 4 }]}>{selectedListing.description}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitOfferBtn}
                onPress={() => {
                  setDetailModalVisible(false);
                  if (selectedListing) handleOpenOfferModal(selectedListing);
                }}
              >
                <Text style={styles.submitOfferText}>{t('makeOfferBtn') || 'Make Offer'}</Text>
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
  // Segmented control
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  offerBadgeCount: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  offerBadgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  list: {
    padding: 16,
    paddingBottom: 32,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  productBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
  },
  cardInfoSection: {
    marginBottom: 10,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary || '#0F172A',
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#475569',
    flex: 1,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginRight: 8,
  },
  viewDetailsBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wasteType: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  farmerName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  qtyBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  descText: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 8,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  priceVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  makeOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  makeOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // My Offers Specific Styles
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeAccepted: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  statusBadgeTextAccepted: {
    color: '#15803D',
  },
  statusBadgeTextRejected: {
    color: '#B91C1C',
  },
  offerDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  offerDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  offerDetailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  contactFarmerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  contactFarmerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  detailModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    padding: 24,
    alignSelf: 'stretch',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginLeft: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
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
  submitOfferBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitOfferText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  searchBarWrapper: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  resetFiltersBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
});
