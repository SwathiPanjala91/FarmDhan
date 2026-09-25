import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { api } from '../../services/api';

const WASTE_FILTER_OPTIONS = ['All', 'Paddy Straw', 'Cotton Residue', 'Sugarcane Residue', 'Wheat Straw'];

export const NearbyBuyersScreen = ({ navigation, route }) => {
  const { user, t } = useAuth();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(route?.params?.wasteType || 'All');
  const [searchQuery, setSearchQuery] = useState(route?.params?.searchQuery || '');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  useEffect(() => {
    if (route?.params?.searchQuery) setSearchQuery(route.params.searchQuery);
    if (route?.params?.wasteType) setSelectedFilter(route.params.wasteType);
  }, [route?.params?.searchQuery, route?.params?.wasteType]);

  const fetchNearbyBuyers = async () => {
    try {
      setLoading(true);
      const lat = user?.location?.latitude || 17.9784;
      const lon = user?.location?.longitude || 79.5941;
      const res = await api.buyers.getNearby(lat, lon, 100, selectedFilter === 'All' ? '' : selectedFilter);

      if (res.success && Array.isArray(res.buyers)) {
        setBuyers(res.buyers);
      } else {
        setBuyers([]);
      }
    } catch (err) {
      console.warn('Nearby buyers API warning:', err.message);
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyBuyers();
  }, [selectedFilter]);

  const filteredBuyers = buyers.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.businessName?.toLowerCase().includes(q) ||
      b.location?.city?.toLowerCase().includes(q) ||
      b.location?.district?.toLowerCase().includes(q) ||
      b.businessType?.toLowerCase().includes(q)
    );
  });

  const renderBuyerItem = ({ item }) => (
    <View style={[styles.card, SHADOWS.small]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.businessName}>{item.businessName}</Text>
          <Text style={styles.businessType}>{item.businessType}</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.distanceText}>{item.distanceText || `${item.distanceKm} km`}</Text>
        </View>
      </View>

      <View style={styles.wasteTags}>
        {item.wasteTypes?.map((w, idx) => (
          <View key={idx} style={styles.wasteTag}>
            <Text style={styles.wasteTagText}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>{t('offeredBaseRate')}</Text>
          <Text style={styles.priceValue}>
            ₹{item.offeredPrice.toLocaleString('en-IN')}/{item.unit || 'ton'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.priceLabel}>{t('serviceRadius')}</Text>
          <Text style={styles.radiusValue}>{item.serviceRadius || 50} km max</Text>
        </View>
      </View>

      <Text style={styles.reqText}>
        <Text style={{ fontWeight: '700' }}>{t('requirements')}:</Text> {item.requirements}
      </Text>

      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() =>
          navigation.navigate('BuyerMatching', {
            wasteType: item.wasteTypes?.[0] || 'Crop Residue',
          })
        }
      >
        <Text style={styles.ctaText}>{t('viewMatchScore')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('buyersList')}
        subtitle={t('buyersListSubtitle')}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="nearbyBuyers"
        rightAction={
          <TouchableOpacity
            style={styles.viewToggleBtn}
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          >
            <Ionicons name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={18} color="#FFFFFF" />
            <Text style={styles.viewToggleText}>{viewMode === 'list' ? t('mapView') : t('listView')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="nearbyBuyers" />

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchBuyersPlaceholder')}
          placeholderTextColor="#A0AEC0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Waste Filter Chips */}
      <View style={styles.filterRow}>
        {WASTE_FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, selectedFilter === f && styles.filterChipActive]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === f && styles.filterChipTextActive,
              ]}
            >
              {f === 'All' ? t('allFilter') : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode === 'map' ? (
        /* Map View Simulation with Geographic Pins */
        <View style={styles.mapContainer}>
          <View style={styles.mapCard}>
            <Ionicons name="map" size={48} color={COLORS.primary} />
            <Text style={styles.mapTitle}>Telangana Regional Biomass Network</Text>
            <Text style={styles.mapSubtitle}>Showing buyers within 50 km of your farm in Warangal</Text>

            <View style={styles.mapPinsContainer}>
              {filteredBuyers.map((b, i) => (
                <View key={i} style={styles.mapPinRow}>
                  <Ionicons name="location" size={20} color={COLORS.accent} />
                  <Text style={styles.mapPinText}>
                    <Text style={{ fontWeight: '700' }}>{b.businessName}</Text> ({b.distanceText}) — ₹{b.offeredPrice}/ton
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.switchToListBtn}
              onPress={() => setViewMode('list')}
            >
              <Text style={styles.switchToListText}>{t('switchToList')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('locatingBuyers')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBuyers}
          keyExtractor={(item) => item._id}
          renderItem={renderBuyerItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={54} color={COLORS.border} />
              <Text style={styles.emptyTitle}>{t('noBuyersAvailable')}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedFilter !== 'All'
                  ? t('noBuyersFilterSubtitle')
                  : t('noBuyersSubtitle')}
              </Text>
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
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewToggleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  filterChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  wasteTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  wasteTag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  wasteTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  radiusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  reqText: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 12,
  },
  ctaBtn: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mapContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
  },
  mapSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  mapPinsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  mapPinText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  switchToListBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  switchToListText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
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
  },
});
