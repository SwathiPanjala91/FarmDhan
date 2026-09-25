import React from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Core Farmer Screens
import { FarmerDashboard } from '../screens/farmer/FarmerDashboard';
import { ListWasteScreen } from '../screens/farmer/ListWasteScreen';
import { PriceComparisonScreen } from '../screens/farmer/PriceComparisonScreen';
import { BuyerMatchingScreen } from '../screens/farmer/BuyerMatchingScreen';
import { AIAssistantScreen } from '../screens/farmer/AIAssistantScreen';
import { NearbyBuyersScreen } from '../screens/farmer/NearbyBuyersScreen';
import { MyListingsScreen } from '../screens/farmer/MyListingsScreen';

// Core Buyer Screens
import { BuyerDashboard } from '../screens/buyer/BuyerDashboard';
import { BrowseListingsScreen } from '../screens/buyer/BrowseListingsScreen';
import { CreateRequirementScreen } from '../screens/buyer/CreateRequirementScreen';
import { MyOffersScreen } from '../screens/buyer/MyOffersScreen';

// Common Support & Profile
import { SupportScreen } from '../screens/common/SupportScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { MarketInsightsScreen } from '../screens/common/MarketInsightsScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Simple, Direct Farmer Bottom Navigation (5 Core Actions)
const FarmerTabs = () => {
  const { language, t } = useAuth();

  const getTabLabel = (key) => {
    if (key === 'Home') return language === 'te' ? 'హోమ్' : language === 'hi' ? 'होम' : 'Home';
    if (key === 'ListWaste') return language === 'te' ? 'అమ్మండి' : language === 'hi' ? 'लिस्ट करें' : 'List Waste';
    if (key === 'Prices') return language === 'te' ? 'ధరలు' : language === 'hi' ? 'कीमतें' : 'Prices';
    if (key === 'AI') return language === 'te' ? 'AI సాయం' : language === 'hi' ? 'AI सहायक' : 'AI Voice';
    if (key === 'Profile') return language === 'te' ? 'ఖాతా' : language === 'hi' ? 'प्रोफ़ाइल' : 'Profile';
    return key;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 2,
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName = 'home';
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'ListWasteTab') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'PricesTab') iconName = focused ? 'swap-vertical' : 'swap-vertical-outline';
          else if (route.name === 'AITab') iconName = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';

          const size = route.name === 'ListWasteTab' || route.name === 'AITab' ? 26 : 22;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={FarmerDashboard}
        options={{ tabBarLabel: getTabLabel('Home') }}
      />
      <Tab.Screen
        name="ListWasteTab"
        component={ListWasteScreen}
        options={{ tabBarLabel: getTabLabel('ListWaste') }}
      />
      <Tab.Screen
        name="PricesTab"
        component={PriceComparisonScreen}
        options={{ tabBarLabel: getTabLabel('Prices') }}
      />
      <Tab.Screen
        name="AITab"
        component={AIAssistantScreen}
        options={{ tabBarLabel: getTabLabel('AI') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: getTabLabel('Profile') }}
      />
    </Tab.Navigator>
  );
};

// Simple Buyer Bottom Navigation
const BuyerTabs = () => {
  const { language } = useAuth();

  const getBuyerTabLabel = (key) => {
    if (key === 'Dashboard') return language === 'te' ? 'డ్యాష్‌బోర్డ్' : language === 'hi' ? 'डैशबोर्ड' : 'Dashboard';
    if (key === 'Browse') return language === 'te' ? 'వ్యర్థాల శోధన' : language === 'hi' ? 'अवशेष खोजें' : 'Browse Waste';
    if (key === 'Offers') return language === 'te' ? 'నా ఆఫర్లు' : language === 'hi' ? 'मेरे ऑफ़र' : 'My Offers';
    if (key === 'AI') return language === 'te' ? 'AI సహాయకుడు' : language === 'hi' ? 'एआई सहायक' : 'AI Assistant';
    if (key === 'Profile') return language === 'te' ? 'ఖాతా' : language === 'hi' ? 'प्रोफ़ाइल' : 'Profile';
    return key;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 2,
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName = 'business';
          if (route.name === 'BuyerHomeTab') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'BrowseTab') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'MyOffersTab') iconName = focused ? 'pricetag' : 'pricetag-outline';
          else if (route.name === 'BuyerAITab') iconName = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'BuyerProfileTab') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="BuyerHomeTab"
        component={BuyerDashboard}
        options={{ tabBarLabel: getBuyerTabLabel('Dashboard') }}
      />
      <Tab.Screen
        name="BrowseTab"
        component={BrowseListingsScreen}
        options={{ tabBarLabel: getBuyerTabLabel('Browse') }}
      />
      <Tab.Screen
        name="MyOffersTab"
        component={MyOffersScreen}
        options={{ tabBarLabel: getBuyerTabLabel('Offers') }}
      />
      <Tab.Screen
        name="BuyerAITab"
        component={AIAssistantScreen}
        options={{ tabBarLabel: getBuyerTabLabel('AI') }}
      />
      <Tab.Screen
        name="BuyerProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: getBuyerTabLabel('Profile') }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {/* Auth Flows */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Dashboards */}
        <Stack.Screen name="FarmerTabs" component={FarmerTabs} />
        <Stack.Screen name="BuyerTabs" component={BuyerTabs} />

        {/* Secondary Screens */}
        <Stack.Screen name="ListWaste" component={ListWasteScreen} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} />
        <Stack.Screen name="BuyerMatching" component={BuyerMatchingScreen} />
        <Stack.Screen name="PriceComparison" component={PriceComparisonScreen} />
        <Stack.Screen name="NearbyBuyers" component={NearbyBuyersScreen} />
        <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="MarketInsights" component={MarketInsightsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="BrowseListings" component={BrowseListingsScreen} />
        <Stack.Screen name="MyOffers" component={MyOffersScreen} />
        <Stack.Screen name="CreateRequirement" component={CreateRequirementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
