import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import RecordScreen from './src/screens/RecordScreen';
import KnowledgeScreen from './src/screens/KnowledgeScreen';
import KnowledgeCategoryScreen from './src/screens/KnowledgeCategoryScreen';
import KnowledgeItemScreen from './src/screens/KnowledgeItemScreen';
import ChatScreen from './src/screens/ChatScreen';

export type RootStackParamList = {
  Home: undefined;
  Record: { field: string };
  Knowledge: { field: string };
  KnowledgeCategory: { field: string; category: string };
  KnowledgeItem: { field: string; category: string; item: string };
  Chat: { field: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Record" component={RecordScreen} />
        <Stack.Screen name="Knowledge" component={KnowledgeScreen} />
        <Stack.Screen name="KnowledgeCategory" component={KnowledgeCategoryScreen} />
        <Stack.Screen name="KnowledgeItem" component={KnowledgeItemScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
