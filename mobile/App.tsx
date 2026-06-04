import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from './src/constants/theme';

import HomeScreen from './src/screens/HomeScreen';
import RecordScreen from './src/screens/RecordScreen';
import KnowledgeScreen from './src/screens/KnowledgeScreen';
import KnowledgeCategoryScreen from './src/screens/KnowledgeCategoryScreen';
import KnowledgeItemScreen from './src/screens/KnowledgeItemScreen';
import ChatScreen from './src/screens/ChatScreen';
import WebScreen from './src/screens/WebScreen';
import PlanScreen from './src/screens/PlanScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Record: { field: string };
  KnowledgeCategory: { field: string; category: string };
  KnowledgeItem: { field: string; category: string; item: string };
  Web: { field: string };
};

export type TabParamList = {
  Home: undefined;
  Knowledge: { field?: string };
  Chat: { field?: string };
  Plan: { field?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⊞',
    Knowledge: '◈',
    Chat: '◎',
    Plan: '◷',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
      {icons[label] ?? '○'}
    </Text>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarLabel: () => null,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Knowledge" component={KnowledgeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Record" component={RecordScreen} />
        <Stack.Screen name="KnowledgeCategory" component={KnowledgeCategoryScreen} />
        <Stack.Screen name="KnowledgeItem" component={KnowledgeItemScreen} />
        <Stack.Screen name="Web" component={WebScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
