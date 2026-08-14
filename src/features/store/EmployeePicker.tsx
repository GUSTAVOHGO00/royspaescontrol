import { FormEvent, useEffect, useState } from "react";
import { Plus, UserRound, X } from "lucide-react";
import type { Employee, Unit } from "../../data/unitRepository";
import { unitRepository } from "../../data/unitRepository";
import "./employeePicker.css";

interface EmployeeRepo { listActiveEmployees(unitId:string):Promise<Employee[]>; createEmployee(unitId:string,name:string,source?:"admin"|"store"):Promise<Employee> }
export function EmployeePicker({unit,selectedId,onSelect,repository=unitRepository}:{unit:Unit;selectedId:string;onSelect:(employee:Employee)=>void;repository?:EmployeeRepo}) {
  const [employees,setEmployees]=useState<Employee[]>([]); const [creating,setCreating]=useState(false); const [name,setName]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{void repository.listActiveEmployees(unit.id).then(setEmployees).catch(()=>setError("Não conseguimos carregar os funcionários."));},[repository,unit.id]);
  async function save(event:FormEvent){event.preventDefault();setError("");try{const employee=await repository.createEmployee(unit.id,name.trim().replace(/\s+/g," "),"store");setEmployees(current=>[...current,employee].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")));onSelect(employee);setCreating(false);setName("");}catch{setError("Este funcionário já pode estar cadastrado. Atualize a lista e selecione o nome.");}}
  return <div className="employee-picker"><div className="fixed-unit"><span>Unidade</span><strong>{unit.name}</strong></div><label>Quem está fechando?<select aria-label="Funcionário responsável" value={selectedId} onChange={e=>{const found=employees.find(item=>item.id===e.target.value);if(found)onSelect(found);}}><option value="">Selecione seu nome</option>{employees.map(employee=><option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
  {!creating?<button type="button" className="employee-add" onClick={()=>setCreating(true)}><Plus/>Cadastrar funcionário</button>:<form className="employee-create" onSubmit={save}><label>Nome do funcionário<input autoFocus minLength={2} value={name} onChange={e=>setName(e.target.value)} required/></label><button type="submit"><UserRound/>Salvar</button><button type="button" aria-label="Cancelar cadastro" onClick={()=>setCreating(false)}><X/></button></form>}{error&&<p role="alert">{error}</p>}</div>;
}
