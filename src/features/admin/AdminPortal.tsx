import { useCallback, useEffect, useState } from "react";
import { cloudClosingRepository } from "../../data/cloudClosingRepository";
import type { ClosingCounts, StoredClosing } from "../../data/models";
import { AdminCorrection } from "./AdminCorrection";
import { AdminDashboard } from "./AdminDashboard";

const emptyCounts={opening:{q30:0,q15:0},produced:{q30:0,q15:0},waste:{q30:0,q15:0},courtesy:{q30:0,q15:0},leftover:{q30:0,q15:0}};
function mapRow(r:any):StoredClosing{return{id:r.id,revision:r.revision,correctsId:r.corrects_id??undefined,catalogVersion:r.catalog_version,date:r.business_date??r.closing_date,shift:r.shift,unit:r.unit_name,responsible:r.responsible,createdByRole:r.created_by_role,counts:r.counts??emptyCounts,report:r.report??{},reportMode:r.report_mode,parsedItems:r.parsed_items??[],physical:Number(r.physical),system:Number(r.system),difference:Number(r.difference),status:r.status,justification:r.roys_closing_justifications?.[0]?.explanation??r.justification??"",createdAt:r.submitted_at??r.created_at}}

export function AdminPortal({onBack,onLogout}:{onBack:()=>void;onLogout:()=>void}){
  const[records,setRecords]=useState<StoredClosing[]>([]);const[error,setError]=useState("");const[correction,setCorrection]=useState<StoredClosing|null>(null);
  const load=useCallback(async()=>{try{const rows=await cloudClosingRepository.listAdminClosings();setRecords(rows.map(mapRow));setError("")}catch{setError("Não foi possível carregar os dados do painel.")}},[]);
  useEffect(()=>{void load()},[load]);
  async function saveCorrection(payload:{counts:ClosingCounts;report:Record<string,number>;explanation:string}){if(!correction)return;await cloudClosingRepository.createAdminCorrection(correction.correctsId??correction.id,payload);setCorrection(null);await load()}
  if(error)return <main className="system-loading"><p role="alert">{error}</p><button onClick={()=>void load()}>Tentar novamente</button><button onClick={onLogout}>Sair</button></main>;
  return <><AdminDashboard records={records} onBack={onBack} onCorrect={setCorrection} onLogout={onLogout}/>{correction&&<AdminCorrection record={correction} onCancel={()=>setCorrection(null)} onSave={saveCorrection}/>}</>
}
