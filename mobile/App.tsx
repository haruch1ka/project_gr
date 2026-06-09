import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { colors } from './src/constants/theme';
import {
  HomeIcon, BookOpenIcon, PencilSquareIcon,
  ChatBubbleOvalLeftIcon, ClipboardDocumentListIcon,
} from 'react-native-heroicons/outline';
import {
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ChatBubbleOvalLeftIcon as ChatIconSolid,
  ClipboardDocumentListIcon as LogIconSolid,
} from 'react-native-heroicons/solid';

import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import KnowledgeScreen from './src/screens/KnowledgeScreen';
import KnowledgeItemScreen from './src/screens/KnowledgeItemScreen';
import ChatScreen from './src/screens/ChatScreen';
import WebScreen from './src/screens/WebScreen';
import ExperienceScreen from './src/screens/ExperienceScreen';
import LogScreen from './src/screens/LogScreen';
import QuickLogScreen from './src/screens/QuickLogScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HypothesisScreen from './src/screens/HypothesisScreen';
import { FieldProvider, useField } from './src/context/FieldContext';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  FieldTabs:         { field?: string };
  Home:              undefined;
  Log:               { field: string };
  KnowledgeItem:     { field: string; category: string; id: string };
  Web:               { field: string };
  QuickLog:          { field?: string; fields?: { name: string; icon: string }[] };
  Settings:          undefined;
  Hypothesis:        { field: string };
};

export type FieldTabParamList = {
  Dashboard:  undefined;
  Knowledge:  undefined;
  _FieldLog:  undefined;
  Chat:       undefined;
  Experience: undefined;
};

// ─── ナビゲーターインスタンス ─────────────────────────────────────────────

const Stack    = createNativeStackNavigator<RootStackParamList>();
const FieldTab = createBottomTabNavigator<FieldTabParamList>();

// ─── タブバー ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<string, string> = {
  Dashboard:  'ホーム',
  Knowledge:  '知識',
  Chat:       '対話',
  Experience: '記録',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.blue : colors.textSecondary;
  const p = { size: 24, color, strokeWidth: focused ? 2 : 1.5 };
  if (name === 'Dashboard') return focused ? <HomeIconSolid {...p} /> : <HomeIcon {...p} />;
  if (name === 'Knowledge') return focused ? <BookOpenIconSolid {...p} /> : <BookOpenIcon {...p} />;
  if (name === 'Chat')      return focused ? <ChatIconSolid {...p} /> : <ChatBubbleOvalLeftIcon {...p} />;
  if (name === 'Experience') return focused ? <LogIconSolid {...p} /> : <ClipboardDocumentListIcon {...p} />;
  return null;
}

function FieldTabBar({ state, navigation }: any) {
  const { activeField, fields } = useField();
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route: any, index: number) => {
        const focused  = state.index === index;
        const isCenter = route.name === '_FieldLog';

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              style={tabStyles.centerWrap}
              onPress={() => navigation.getParent()?.navigate('QuickLog', { field: activeField, fields })}
              activeOpacity={0.8}
            >
              <View style={tabStyles.centerBtn}>
                <PencilSquareIcon size={22} color="#fff" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          );
        }

        const label = TAB_LABELS[route.name] ?? route.name;
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
            <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
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
    height: 72, paddingBottom: 10,
  },
  tab:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label:        { fontSize: 10, color: colors.textSecondary },
  labelFocused: { color: colors.blue },
  centerWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.blue, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
  },
});

// ─── フィールドTabナビゲーター ────────────────────────────────────────────

function EmptyScreen() { return null; }

function FieldTabNavigator({ route }: { route: RouteProp<RootStackParamList, 'FieldTabs'> }) {
  const initialField = route.params?.field;
  return (
    <FieldProvider initialField={initialField}>
      <FieldTab.Navigator
        tabBar={props => <FieldTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <FieldTab.Screen name="Dashboard" component={DashboardScreen} />
        <FieldTab.Screen name="Knowledge" component={KnowledgeScreen} />
        <FieldTab.Screen name="_FieldLog" component={EmptyScreen} />
        <FieldTab.Screen name="Chat"       component={ChatScreen} />
        <FieldTab.Screen name="Experience" component={ExperienceScreen} />
      </FieldTab.Navigator>
    </FieldProvider>
  );
}

// ─── ルートApp ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="FieldTabs" component={FieldTabNavigator} />
          <Stack.Screen name="Home"      component={HomeScreen} />
          <Stack.Screen name="Log"       component={LogScreen} />
          <Stack.Screen name="KnowledgeItem"     component={KnowledgeItemScreen} />
          <Stack.Screen name="Web"       component={WebScreen} />
          <Stack.Screen
            name="QuickLog"
            component={QuickLogScreen}
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="Settings"   component={SettingsScreen} />
          <Stack.Screen name="Hypothesis" component={HypothesisScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
