import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';

import HomeScreen from '../screens/buyer/HomeScreen';
import MapScreen from '../screens/buyer/MapScreen';
import ReservationsScreen from '../screens/buyer/ReservationsScreen';
import ProfileScreen from '../screens/buyer/ProfileScreen';
import OfferDetailScreen from '../screens/buyer/OfferDetailScreen';
import RestaurantProfileScreen from '../screens/buyer/RestaurantProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Ekrani koji nemaju tab bar (Navbar: Ne u specifikaciji)
const EKRANI_BEZ_TABBARA = ['OfferDetail', 'RestaurantProfile'];

// HomeStack - početni ekran sa detaljima ponude i profilom restorana
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
    <Stack.Screen name="RestaurantProfile" component={RestaurantProfileScreen} />
  </Stack.Navigator>
);

// MapStack - mapa sa istim detaljnim ekranima dostupnim i odavde
const MapStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MapMain" component={MapScreen} />
    <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
    <Stack.Screen name="RestaurantProfile" component={RestaurantProfileScreen} />
  </Stack.Navigator>
);

const BuyerNavigator = () => {
  const { colors } = useTheme();

  // Stilovi tab bara - definisani ovde da bi koristili dinamičke boje iz teme
  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    paddingTop: 6,
  };

  // Vraća display:none za tab bar kada je aktivan ekran koji ga ne treba
  const getTabBarStyle = (route) => {
    const routeName = getFocusedRouteNameFromRoute(route) ?? '';
    if (EKRANI_BEZ_TABBARA.includes(routeName)) return { display: 'none' };
    return tabBarStyle;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Mapa: focused ? 'map' : 'map-outline',
            Rezervacije: focused ? 'receipt' : 'receipt-outline',
            Profil: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
      })}
    >
      {/* options sa getTabBarStyle override-uje tabBarStyle iz screenOptions */}
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({ route }) => ({
          title: 'Početna',
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name="Mapa"
        component={MapStack}
        options={({ route }) => ({
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen name="Rezervacije" component={ReservationsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default BuyerNavigator;
