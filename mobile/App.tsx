import React from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from './src/constants/theme';
import {
  HomeIcon,
  BookOpenIcon,
  PencilSquareIcon,
  ChatBubbleOvalLeftIcon,
  ClipboardDocumentListIcon,
} from 'react-native-heroicons/outline';
import {
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ChatBubbleOvalLeftIcon as ChatIconSolid,
  ClipboardDocumentListIcon as PlanIconSolid,
} from 'react-native-heroicons/solid';

import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import KnowledgeScreen from './src/screens/KnowledgeScreen';
import KnowledgeCategoryScreen from './src/screens/KnowledgeCategoryScreen';
import KnowledgeItemScreen from './src/screens/KnowledgeItemScreen';
import ChatScreen from './src/screens/ChatScreen';
import WebScreen from './src/screens/WebScreen';
import PlanScreen from './src/screens/PlanScreen';
import LogScreen from './src/screens/LogScreen';
import QuickLogScreen from './src/screens/QuickLogScreen';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Dashboard: { field: string };
  Log: { field: string };
  Knowledge: { field: string };
  KnowledgeCategory: { field: string; category: string };
  KnowledgeItem: { field: string; category: string; item: string };
  Web: { field: string };
  QuickLog: undefined;
};

export type TabParamList = {
  Home: undefined;
  Knowledge: { field?: string };
  _QuickLog: undefined;
  Chat: { field?: string };
  Plan: { field?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.primary : colors.textSecondary;
  const props = { size: 24, color, strokeWidth: focused ? 2 : 1.5 };
  if (name === 'Home')      return focused ? <HomeIconSolid {...props} /> : <HomeIcon {...props} />;
  if (name === 'Knowledge') return focused ? <BookOpenIconSolid {...props} /> : <BookOpenIcon {...props} />;
  if (name === 'Chat')      return focused ? <ChatIconSolid {...props} /> : <ChatBubbleOvalLeftIcon {...props} />;
  if (name === 'Plan')      return focused ? <PlanIconSolid {...props} /> : <ClipboardDocumentListIcon {...props} />;
  return null;
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const isCenter = route.name === '_QuickLog';

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              style={tabStyles.centerWrap}
              onPress={() => navigation.getParent()?.navigate('QuickLog')}
              activeOpacity={0.8}
            >
              <View style={tabStyles.centerBtn}>
                <PencilSquareIcon size={24} color="#fff" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={tabStyles.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
          >
            <TabIcon name={route.name} focused={focused} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1, borderTopColor: colors.border,
    height: 64, paddingBottom: 8,
  },
  tab:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  centerIcon: { fontSize: 22 },
});

function EmptyScreen() { return null; }

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Knowledge" component={KnowledgeScreen} />
      <Tab.Screen name="_QuickLog" component={EmptyScreen} />
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
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Log" component={LogScreen} />
          <Stack.Screen name="Knowledge" component={KnowledgeScreen} />
          <Stack.Screen name="KnowledgeCategory" component={KnowledgeCategoryScreen} />
          <Stack.Screen name="KnowledgeItem" component={KnowledgeItemScreen} />
          <Stack.Screen name="Web" component={WebScreen} />
          <Stack.Screen
            name="QuickLog"
            component={QuickLogScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
