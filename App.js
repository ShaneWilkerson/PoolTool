import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Import screens
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import CurrentPoolScreen from './screens/CurrentPoolScreen';
import ChemicalTrackerScreen from './screens/ChemicalTrackerScreen';
import MapScreen from './screens/MapScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import BillingScreen from './screens/BillingScreen';
import ProfileScreen from './screens/ProfileScreen';
import AddCustomerScreen from './screens/AddCustomerScreen';
import AddInvoiceScreen from './screens/AddInvoiceScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import MarkInvoicePaidScreen from './screens/MarkInvoicePaidScreen';
import CustomerListScreen from './screens/CustomerListScreen';
import CustomerDetailScreen from './screens/CustomerDetailScreen';
import CreatePoolVisitScreen from './screens/CreatePoolVisitScreen';
import AddToDoScreen from './screens/AddToDoScreen';
import AccountBillingScreen from './screens/AccountBillingScreen';
import AddSupplyStoreScreen from './screens/AddSupplyStoreScreen';
import ViewSupplyStoresScreen from './screens/ViewSupplyStoresScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Auth" component={AuthScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
);

// Main app tabs navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Current Pool') {
            iconName = focused ? 'water' : 'water-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Billing') {
            iconName = focused ? 'card' : 'card-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00BFFF',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#00BFFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Current Pool" component={CurrentPoolScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Billing" component={BillingScreen} />
    </Tab.Navigator>
  );
};

// Root navigator that handles authentication
const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="AddCustomer" 
        component={AddCustomerScreen}
        options={{
          title: 'Add Customer',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="AddInvoice" 
        component={AddInvoiceScreen}
        options={{
          title: 'New Invoice',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="AddExpense" 
        component={AddExpenseScreen}
        options={{
          title: 'Add Expense',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="MarkInvoicePaid" 
        component={MarkInvoicePaidScreen}
        options={{
          title: 'Mark Invoice as Paid',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="CustomerList" 
        component={CustomerListScreen}
        options={{
          title: 'Customers',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="CustomerDetail" 
        component={CustomerDetailScreen}
        options={{
          title: 'Customer Details',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="CreatePoolVisit" 
        component={CreatePoolVisitScreen}
        options={{
          title: 'Create Pool Visit',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="AddToDo" 
        component={AddToDoScreen}
        options={{
          title: 'Add To-do Item',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="AccountBilling" 
        component={AccountBillingScreen}
        options={{
          title: 'Account Billing',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="AddSupplyStore" 
        component={AddSupplyStoreScreen}
        options={{
          title: 'Add Supply Store',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="ViewSupplyStores" 
        component={ViewSupplyStoresScreen}
        options={{
          title: 'Supply Stores',
          headerStyle: { backgroundColor: '#00BFFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00BFFF" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          {user ? <RootNavigator /> : <AuthNavigator />}
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
