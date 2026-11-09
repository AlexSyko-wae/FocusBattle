import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount } from '@/hooks/account-context';
import { PixelSprite } from '@/components/battle-art';
import {CampHome} from '@/components/camp-home';

export default function Home() {
  const account = useAccount();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword,setShowPassword]=useState(false);

  async function submit() {
    if (await account.authenticate(email, password, register)) {setPassword('');setShowPassword(false);}
  }
  if(account.ready&&account.session)return <CampHome key={account.session.user.id}/>;
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.brand}><View style={styles.brandMark}><PixelSprite kind="hero" pixel={3}/></View><View style={styles.brandText}>
        <Text style={styles.eyebrow}>APRENDE. LUCHA. SUPÉRATE.</Text>
        <Text style={styles.title}>FOCUS<Text style={styles.titleAccent}>BATTLE</Text></Text>
      </View></View>
      {!account.ready ? <ActivityIndicator color="#E9B949" accessibilityLabel="Recuperando sesión" /> : <View style={styles.card}>
        <Text style={styles.label}>{register ? 'CREA TU AVENTURERO' : 'CONTINÚA TU AVENTURA'}</Text>
        <Text nativeID="email-label" style={styles.text}>Correo electrónico</Text>
        <TextInput accessibilityLabel="Correo electrónico" style={styles.input} value={email} onChangeText={setEmail} editable={!account.busy}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="tu@correo.com" placeholderTextColor="#aaa4bf" maxLength={254} />
        <Text style={styles.text}>Contraseña</Text>
        <TextInput accessibilityLabel="Contraseña" style={styles.input} value={password} onChangeText={setPassword} editable={!account.busy}
          secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete={register ? 'new-password' : 'current-password'}
          placeholder={register ? 'Mínimo 8 caracteres' : 'Tu contraseña'} placeholderTextColor="#aaa4bf" onSubmitEditing={() => void submit()} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:showPassword}} onPress={()=>setShowPassword(value=>!value)} style={{paddingVertical:10}}><Text style={styles.link}>{showPassword?'☑ Ocultar contraseña':'☐ Mostrar contraseña'}</Text></Pressable>
        {!!account.message && <Text accessibilityLiveRegion="polite" style={styles.status}>{account.message}</Text>}
        <Action label={account.busy ? 'ESPERA…' : register ? 'CREAR CUENTA' : 'INICIAR SESIÓN'} disabled={account.busy} onPress={() => void submit()} />
        <Pressable accessibilityRole="button" disabled={account.busy} onPress={() => { setRegister(!register); setPassword('');setShowPassword(false); }} style={styles.switch}>
          <Text style={styles.link}>{register ? 'Ya tengo cuenta · Iniciar sesión' : 'Soy nuevo · Crear cuenta'}</Text>
        </Pressable>
      </View>}
    </ScrollView></KeyboardAvoidingView>
  </SafeAreaView>;
}
function Action({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
    <Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: '#101321' }, content: { padding: 26, flexGrow: 1, justifyContent: 'center', gap: 22,maxWidth:640,width:'100%',alignSelf:'center' },
  brand:{flexDirection:'row',alignItems:'center',gap:12},brandMark:{backgroundColor:'#22233b',borderWidth:1,borderColor:'#7855C8',padding:8},brandText:{flex:1,gap:8},
  eyebrow: { color: '#43BFA0', fontSize: 8, letterSpacing: 1 }, title: { color: '#E9B949', fontSize: 24, fontWeight: '900',lineHeight:28 },titleAccent:{color:'#c3a7ff'},
  card: { borderWidth: 2, borderColor: '#7855C8', padding: 20, backgroundColor: '#191c30', gap: 15 },
  label: { color: '#E9B949', fontWeight: 'bold', letterSpacing: 1 }, text: { color: '#e9e5f5', lineHeight: 23 },
  level: { color: '#E9B949', fontWeight: 'bold', fontSize: 26 }, muted: { color: '#aaa4bf', fontSize: 12, lineHeight: 20 },
  status: { color: '#E9B949', lineHeight: 23 }, input: { borderWidth: 1, borderColor: '#77718b', color: '#fff', backgroundColor: '#101321', padding: 14, fontSize: 16 },
  button: { backgroundColor: '#7855C8', padding: 17 }, disabled: { opacity: 0.5 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  switch: { paddingVertical: 12 }, link: { color: '#bfa6ff', textAlign: 'center', lineHeight: 22 },
});

