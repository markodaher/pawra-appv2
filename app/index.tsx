import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [status, setStatus] = useState<string>('');

  const testConnection = async () => {
    const { data, error } = await supabase.auth.getSession();
    console.log('[supabase.getSession]', { data, error });
    setStatus(
      error
        ? `Error: ${error.message}`
        : `OK — session: ${data.session ? 'present' : 'none'}`,
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pawra v2 — Foundation Ready</Text>
      <Button title="Test Supabase connection" onPress={testConnection} />
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: { fontSize: 18, fontWeight: '600' },
  status: { fontSize: 14, color: '#444', textAlign: 'center' },
});
