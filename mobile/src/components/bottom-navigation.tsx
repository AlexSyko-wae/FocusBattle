import {router,usePathname} from 'expo-router';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
const tabs=[{path:'/' as const,label:'Campamento',icon:'⌂'},{path:'/arena' as const,label:'Arena',icon:'⚔'},{path:'/profile' as const,label:'Perfil',icon:'◇'}];
export function BottomNavigation(){
 const path=usePathname();const{height}=useWindowDimensions();
 return <View accessibilityRole="tablist" style={[styles.bar,height<500&&styles.compact]}>{tabs.map(tab=>{
  const selected=tab.path==='/'?path==='/':path===tab.path||(tab.path==='/arena'&&path==='/prepare')||(tab.path==='/profile'&&path==='/medals');
  return <Pressable key={tab.path} accessibilityRole="tab" accessibilityState={{selected}} onPress={()=>{if(path!==tab.path)router.replace(tab.path);}} style={({pressed})=>[styles.tab,selected&&styles.active,pressed&&styles.pressed]}>
   <Text style={[styles.icon,selected&&styles.gold]}>{tab.icon}</Text><Text style={[styles.label,selected&&styles.gold]}>{tab.label}</Text>{selected&&<View style={styles.marker}/>}
  </Pressable>;
 })}</View>;
}
const styles=StyleSheet.create({bar:{flexDirection:'row',backgroundColor:'#121726',borderTopWidth:1,borderColor:'#333750',paddingHorizontal:14,paddingTop:7,paddingBottom:5,gap:10},compact:{paddingTop:2,paddingBottom:1},tab:{flex:1,alignItems:'center',justifyContent:'center',minHeight:52,paddingVertical:5,gap:4,borderRadius:12},active:{backgroundColor:'#27233c'},pressed:{opacity:.7},icon:{color:'#898da8',fontSize:20},label:{color:'#a7abc1',fontSize:10,fontWeight:'bold'},gold:{color:'#E9B949'},marker:{position:'absolute',top:0,width:20,height:2,backgroundColor:'#E9B949',borderRadius:2}});
