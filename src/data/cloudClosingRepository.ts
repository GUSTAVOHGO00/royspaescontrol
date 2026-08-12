import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClosingCounts } from "./models";
import { supabase } from "../lib/supabase";

export type AlertLevel="correct"|"small"|"attention"|"relevant"|"critical";
export type ReasonCode="waste_unreported"|"courtesy_unreported"|"count_error"|"system_error"|"store_transfer"|"internal_consumption"|"other";
export interface ClosingReceipt {closingId:string;protocol:string;difference:number;alertLevel:AlertLevel;submissionState:"awaiting_justification"|"complete";submittedAt:string;justifiedAt?:string}
export interface CloudClosingInput {idempotencyKey:string;employeeId:string;businessDate:string;shift:string;counts:ClosingCounts;report:Record<string,number>;reportMode:"file"|"manual";parsedItems?:unknown[];documentPath?:string;documentMetadata?:Record<string,unknown>;clientLocalAt?:string}
function ensure<T>(data:T,error:{message:string}|null):T{if(error)throw new Error(error.message);return data}
export function createCloudClosingRepository(client:SupabaseClient){return{
 async submitClosing(input:CloudClosingInput):Promise<ClosingReceipt>{const {data,error}=await client.rpc("submit_store_closing",{payload:input});return ensure(data,error) as ClosingReceipt;},
 async justifyClosing(input:{closingId:string;reasonCode:ReasonCode;explanation:string}):Promise<ClosingReceipt>{const {data,error}=await client.rpc("justify_store_closing",{closing_id:input.closingId,reason_code:input.reasonCode,explanation:input.explanation});return ensure(data,error) as ClosingReceipt;},
 async uploadEvidence(unitId:string,closingId:string,file:File){const safe=file.name.normalize("NFD").replace(/[^a-zA-Z0-9._-]/g,"-");const path=`${unitId}/${closingId}/original-${safe}`;const {error}=await client.storage.from("roys-closing-evidence").upload(path,file,{upsert:false});ensure(null,error);return path;},
 async listAdminClosings(){const {data,error}=await client.from("roys_closings").select("*,roys_closing_justifications(reason_code,explanation,justified_at)").order("submitted_at",{ascending:false});return ensure(data??[],error);},
 async createAdminCorrection(originalId:string,payload:{counts:ClosingCounts;report:Record<string,number>;explanation:string}){const {data,error}=await client.rpc("create_admin_closing_correction",{original_id:originalId,payload});return ensure(data,error);}
};}
export const cloudClosingRepository=createCloudClosingRepository(supabase);
