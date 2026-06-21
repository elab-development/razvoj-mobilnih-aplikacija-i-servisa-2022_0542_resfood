import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';

import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import RestaurantsScreen from '../screens/admin/RestaurantsScreen';

const Tab = createBottomTabNavigator();

const AdminNavigator = () => {
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
            Panel: focused ? 'stats-chart' : 'stats-chart-outline',
            Korisnici: focused ? 'people' : 'people-outline',
            Restorani: focused ? 'restaurant' : 'restaurant-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Panel" component={AdminPanelScreen} />
      <Tab.Screen name="Korisnici" component={UsersScreen} />
      <Tab.Screen name="Restorani" component={RestaurantsScreen} />
    </Tab.Navigator>
  );
};

export default AdminNavigator;
