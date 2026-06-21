import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';

import DashboardScreen from '../screens/restaurant/DashboardScreen';
import AddEditOfferScreen from '../screens/restaurant/AddEditOfferScreen';
import OrdersScreen from '../screens/restaurant/OrdersScreen';
import RestaurantProfileEditScreen from '../screens/restaurant/RestaurantProfileEditScreen';

const Tab = createBottomTabNavigator();

const RestaurantNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 10,
          paddingTop: 6,
        },
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
            Dashboard: focused ? 'grid' : 'grid-outline',
            Dodaj: focused ? 'add-circle' : 'add-circle-outline',
            Porudzbine: focused ? 'bag' : 'bag-outline',
            Profil: focused ? 'storefront' : 'storefront-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Ponude' }} />
      <Tab.Screen name="Dodaj" component={AddEditOfferScreen} />
      <Tab.Screen name="Porudzbine" component={OrdersScreen} options={{ title: 'Porudžbine' }} />
      <Tab.Screen name="Profil" component={RestaurantProfileEditScreen} />
    </Tab.Navigator>
  );
};

export default RestaurantNavigator;
