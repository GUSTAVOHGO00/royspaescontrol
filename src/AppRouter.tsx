import { useState } from "react";
import { App } from "./App";
import { useAuth } from "./auth/AuthProvider";
import { authService } from "./auth/authService";
import { resolveAppRoute } from "./routing/appRoute";
import { StoreLogin } from "./features/store/StoreLogin";
import { CloudAdminAccess } from "./features/admin/CloudAdminAccess";
import { AdminPortal } from "./features/admin/AdminPortal";
import { PasswordRecovery } from "./features/admin/PasswordRecovery";

export function AppRouter(){const route=resolveAppRoute(window.location.pathname);const auth=useAuth();const[,rerender]=useState(0);if(auth.loading)return <main className="system-loading">Preparando o acesso seguro…</main>;
 if(route==="recovery")return <PasswordRecovery/>;
 if(route==="store"){if(!auth.session)return <StoreLogin onLogin={async(u,p)=>{await authService.signInStore(u,p);await auth.refresh();rerender(x=>x+1)}}/>;if(auth.profile?.role!=="store"||!auth.unit)return <RoleMismatch onExit={auth.signOut}/>;return <App storeUnit={auth.unit} onStoreSignOut={()=>void auth.signOut()}/>;}
 if(!auth.session)return <CloudAdminAccess onAuthenticated={async()=>{await auth.refresh();rerender(x=>x+1)}} onBack={()=>{window.location.href="/loja"}}/>;
 if(auth.profile?.role!=="admin")return <RoleMismatch onExit={auth.signOut}/>;
 return <AdminPortal onBack={()=>{window.location.href="/loja"}} onLogout={()=>void auth.signOut()}/>;
}
function RoleMismatch({onExit}:{onExit:()=>Promise<void>}){return <main className="system-loading"><h1>Acesso não permitido</h1><p>Este login não pertence a esta área.</p><button onClick={()=>void onExit()}>Sair</button></main>}
