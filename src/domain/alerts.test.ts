import { expect,it } from "vitest";import { describeDifference } from "./alerts";
it.each([[0,"correct","Tudo correto"],[-2,"small","Faltaram lançar 2"],[2.5,"attention","Sobraram 2,5"],[-7,"relevant","Diferença relevante"],[11,"critical","Alerta crítico"]] as const)("describes %s",(difference,level,copy)=>expect(describeDifference(difference,level).text).toContain(copy));
