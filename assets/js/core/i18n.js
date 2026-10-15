import tr from '../lang/tr.js';import en from '../lang/en.js';
const D={tr,en};let cur='tr';
export const setLang=l=>{cur=D[l]?l:'tr'};
export const langs=()=>Object.keys(D);
export const t=(k,v={})=>{let s=D[cur][k]??D.tr[k]??k;for(const x in v)s=s.replaceAll('{'+x+'}',v[x]);return s};
