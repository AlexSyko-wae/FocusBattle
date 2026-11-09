import type { ReactNode } from 'react';
import { Redirect, router,usePathname } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount } from '@/hooks/account-context';
import {BottomNavigation} from '@/components/bottom-navigation';
export function GameScreen({title,children,scroll=true}:{title:string;children:ReactNode;scroll?:boolean}) {
  const account=useAccount();
  const {height}=useWindowDimensions();
  const path=usePathname();
  if(!account.ready)return <SafeAreaView style={styles.screen}><ActivityIndicator color="#E9B949"/></SafeAreaView>;
  if(!account.session)return <Redirect href="/"/>;
  return <SafeAreaView style={styles.screen}>
    <View style={[styles.header,height<500&&{paddingVertical:0}]}><Pressable accessibilityRole="button" accessibilityLabel="Volver a la pantalla anterior" onPress={()=>router.canGoBack()?router.back():router.replace('/')} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View style={{flex:1,gap:4}}><Text style={styles.brand}>FOCUSBATTLE</Text><Text style={styles.title}>{title}</Text></View></View>
    {scroll?<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>:<View style={{flex:1,padding:10}}>{children}</View>}
    {path!=='/battle'&&<BottomNavigation/>}
  </SafeAreaView>;
}
export function MenuButton({label,detail,onPress,secondary=false}:{label:string;detail?:string;onPress:()=>void;secondary?:boolean}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[styles.menu,secondary&&styles.secondary,pressed&&styles.pressed]}>
    <Text style={[styles.menuLabel,!secondary&&{color:'#292332'}]}>{label}</Text>{detail&&<Text style={[styles.detail,!secondary&&{color:'#5f4a32'}]}>{detail}</Text>}
  </Pressable>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#101321'},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:18,paddingVertical:12,gap:14},back:{height:42,width:42,alignItems:'center',justifyContent:'center',backgroundColor:'#20243a',borderWidth:1,borderColor:'#343b57',borderRadius:12},backText:{color:'#c3a7ff',fontSize:29,lineHeight:33},brand:{color:'#858ba8',fontSize:8,letterSpacing:2},title:{color:'#ede7f5',fontWeight:'bold',fontSize:14,letterSpacing:.7},content:{padding:16,paddingBottom:24,gap:18,maxWidth:1000,width:'100%',alignSelf:'center'},menu:{padding:19,backgroundColor:'#E9B949',borderWidth:1,borderBottomWidth:4,borderColor:'#a9752e',gap:7,minHeight:66,borderRadius:13},secondary:{backgroundColor:'#22253d',borderColor:'#47425f'},pressed:{opacity:0.75},menuLabel:{color:'#fff',fontWeight:'bold',fontSize:14,letterSpacing:.5},detail:{color:'#d4cbe1',fontSize:11,lineHeight:18}});
