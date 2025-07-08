import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (error) {
      Alert.alert('Error', 'Could not send reset email. Please check your email address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>
        {sent ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.confirmText}>A password reset email has been sent to:</Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.confirmText}>Please check your inbox and follow the instructions to create a new password.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Enter your email address and we'll send you a link to reset your password.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSend} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Email'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#00BFFF', fontWeight: '600' }}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#00BFFF', marginBottom: 24 },
  label: { fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e1e5e9', width: 280, marginBottom: 20 },
  button: { backgroundColor: '#00BFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, width: 200 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  confirmText: { fontSize: 16, color: '#222', marginBottom: 8, textAlign: 'center' },
  emailText: { fontSize: 16, color: '#00BFFF', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
});

export default ForgotPasswordScreen; 