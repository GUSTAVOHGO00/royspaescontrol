import type { AlertLevel } from "../data/cloudClosingRepository";
const number=(value:number)=>Math.abs(value).toLocaleString("pt-BR",{maximumFractionDigits:2});
export function describeDifference(difference:number,level:AlertLevel){
 const amount=number(difference); let headline="";let text="";
 if(level==="correct")return{headline:"Tudo correto",text:"Tudo correto. A contagem física bateu com o sistema.",tone:"correct"};
 const direction=difference<0?`Faltaram lançar ${amount} equivalentes de pão no sistema.`:`Sobraram ${amount} equivalentes de pão na conferência física.`;
 if(level==="small"){headline="Pequena diferença";text=`${direction} Informe brevemente o que pode ter acontecido.`}
 else if(level==="attention"){headline="Atenção necessária";text=`${direction} Confira o ocorrido e registre uma explicação clara.`}
 else if(level==="relevant"){headline="Diferença relevante";text=`Diferença relevante. ${direction} Descreva com detalhes o que aconteceu.`}
 else{headline="Alerta crítico";text=`Alerta crítico. ${direction} O fechamento será enviado para análise administrativa.`}
 return{headline,text,tone:level};
}
