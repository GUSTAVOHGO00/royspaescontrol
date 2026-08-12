import type { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Unit } from "../data/unitRepository";

export interface AuthProfile { userId:string; displayName:string; username?:string; role:"admin"|"manager"|"store"; unitId?:string; active:boolean }
interface AuthState { session:Session|null; profile:AuthProfile|null; unit:Unit|null; loading:boolean; refresh:()=>Promise<void>; signOut:()=>Promise<void> }
const AuthContext=createContext<AuthState|undefined>(undefined);

export function AuthProvider({children}:{children:ReactNode}) {
 const [session,setSession]=useState<Session|null>(null); const [profile,setProfile]=useState<AuthProfile|null>(null); const [unit,setUnit]=useState<Unit|null>(null); const [loading,setLoading]=useState(true);
 async function load(next:Session|null){setSession(next);setProfile(null);setUnit(null);if(!next){setLoading(false);return;}const {data,error}=await supabase.from("roys_profiles").select("user_id,display_name,username,role,unit_id,active,roys_units(id,name,active)").eq("user_id",next.user.id).single();if(error||!data||!data.active){await supabase.auth.signOut();setSession(null);setLoading(false);return;}setProfile({userId:data.user_id,displayName:data.display_name,username:data.username??undefined,role:data.role,unitId:data.unit_id??undefined,active:data.active});const related=Array.isArray(data.roys_units)?data.roys_units[0]:data.roys_units;if(related)setUnit({id:related.id,name:related.name,active:related.active});setLoading(false);}
 useEffect(()=>{void supabase.auth.getSession().then(({data})=>load(data.session));const {data}=supabase.auth.onAuthStateChange((_event,next)=>{void load(next)});return()=>data.subscription.unsubscribe();},[]);
 const value=useMemo(()=>({session,profile,unit,loading,refresh:async()=>load((await supabase.auth.getSession()).data.session),signOut:async()=>{await supabase.auth.signOut();}}),[session,profile,unit,loading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("AuthProvider ausente.");return value;}
