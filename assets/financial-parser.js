'use strict';
(function(root){
const metrics={
assets:{label:'総資産',aliases:['資産合計','資産の部合計','資産の部','総資産','資産総額']},
equity:{label:'純資産',aliases:['純資産合計','純資産の部合計','純資産の部','純資産額','資本合計','資本の部合計']},
liabilities:{label:'負債合計',aliases:['負債合計','負債の部合計','負債の部','負債総額']},
cash:{label:'現金・預金合計',aliases:['現金及び預金','現金および預金','現金預金','現預金合計','現金預金合計']},
shortDebt:{label:'短期借入金',aliases:['短期借入金']},
longDebt:{label:'長期借入金',aliases:['長期借入金']},
currentDebt:{label:'1年内返済予定の長期借入金',aliases:['一年内返済予定長期借入金','1年内返済予定長期借入金','1年以内返済予定長期借入金']},
debt:{label:'借入金合計',aliases:['借入金合計','借入金総額','借入残高合計']},
sales:{label:'売上高',aliases:['売上高','売上高合計','売上合計','純売上高','営業収益合計','医業収益合計','医業収益']},
cost:{label:'売上原価',aliases:['売上原価','売上原価合計','当期売上原価']},
gross:{label:'売上総利益',aliases:['売上総利益','売上総利益金額','売上総損益金額']},
sga:{label:'販売費及び一般管理費',aliases:['販売費及び一般管理費','販売費および一般管理費','販売費及び一般管理費合計','販管費合計','販売管理費合計']},
operating:{label:'営業利益',aliases:['営業利益','営業利益金額','営業損失','営業損失金額','営業損益金額']},
ordinary:{label:'経常利益',aliases:['経常利益','経常利益金額','経常損失','経常損失金額','経常損益金額']},
net:{label:'当期純利益',aliases:['当期純利益','当期純利益金額','当期純損失','当期純損失金額','当期純損益金額','差引所得金額']},
depreciation:{label:'減価償却費',aliases:['減価償却費','減価償却費合計']},
interest:{label:'支払利息',aliases:['支払利息','支払利息割引料']},
taxExpense:{label:'法人税等（費用）',aliases:['法人税住民税及び事業税','法人税住民税および事業税','法人税等','法人税等合計']},
taxable:{label:'申告書：所得・欠損金額',aliases:['所得金額又は欠損金額','所得金額または欠損金額','所得金額']},
corporateTax:{label:'申告書：法人税額',aliases:['法人税額']},
finalCorporate:{label:'申告書：差引確定法人税額',aliases:['差引確定法人税額']},
finalLocal:{label:'申告書：差引確定地方法人税額',aliases:['差引確定地方法人税額']},
consumption:{label:'申告書：消費税等の納付税額',aliases:['納付すべき消費税額','消費税及び地方消費税の合計納付又は還付税額','消費税及び地方消費税の合計税額']}
};
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s　\[\]【】〔〕()（）「」:：・]/g,'');
function parseNumber(v){if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v??'').normalize('NFKC').trim().replace(/[¥￥,，\s]/g,'').replace(/(?:円|千円|万円)$/,'');if(/^[—–ー―-]$/.test(s)||!s)return null;let neg=false;if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1)}if(/^[△▲−﹣-]/.test(s)){neg=true;s=s.slice(1)}if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s))return null;let n=Number(s);return Number.isFinite(n)&&n<=1e15?(neg?-n:n):null}
function matchMetric(label){const n=norm(label).replace(/[＊*]/g,'');for(const [key,m] of Object.entries(metrics))if(m.aliases.some(a=>norm(a)===n))return key;return null}
function unitHint(text){const matches=[...String(text).normalize('NFKC').matchAll(/(?:単位\s*[:：]?\s*|[（(]\s*)(百万円|万円|千円|円)/g)].map(m=>m[1]);return [...new Set(matches)]}
function dates(text){const results=[];const t=String(text).normalize('NFKC');for(const m of t.matchAll(/(?:(令和|平成|昭和)\s*(元|\d{1,2})\s*年|(20\d{2})\s*[年/.-])\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?/g)){const y=m[3]?+m[3]:(m[1]==='令和'?2018:m[1]==='平成'?1988:1925)+(m[2]==='元'?1:+m[2]);const value=`${y}-${String(+m[4]).padStart(2,'0')}-${String(+m[5]).padStart(2,'0')}`;if(validDate(value)&&!results.includes(value))results.push(value)}return results.slice(0,12)}
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===v&&+v.slice(0,4)>=1900&&+v.slice(0,4)<=2200}
function monthCount(start,end){if(!validDate(start)||!validDate(end)||end<start)return null;const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');if(a.getUTCDate()!==1||b.getUTCDate()!==new Date(Date.UTC(b.getUTCFullYear(),b.getUTCMonth()+1,0)).getUTCDate())return null;return(b.getUTCFullYear()-a.getUTCFullYear())*12+b.getUTCMonth()-a.getUTCMonth()+1}
function toMan(value,unit){return value*({'円':.0001,'千円':.1,'万円':1,'百万円':100}[unit]??NaN)}
function candidatesFromRows(rows){const result=[];for(const row of rows){const cells=row.cells;for(let i=0;i<cells.length;i++){const text=String(cells[i]??'').trim();let metric=matchMetric(text),label=text,inline=[];if(!metric){const tokens=text.match(/^(.*?)([△▲−-]?\d[\d,]*(?:\.\d+)?)(?:\s|$)/);if(tokens){metric=matchMetric(tokens[1]);label=tokens[1].trim();if(metric){const tail=text.slice(tokens[1].length);inline=[...tail.matchAll(/(?:^|\s)([△▲−-]?\d[\d,]*(?:\.\d+)?)(?=\s|$)/g)].map((m,j)=>({value:parseNumber(m[1]),column:i,header:`行内の数値${j+1}`})).filter(v=>v.value!==null)}}}if(!metric)continue;const values=[...inline];for(let j=i+1;j<cells.length;j++){if(matchMetric(cells[j]))break;const n=parseNumber(cells[j]);if(n!==null)values.push({value:n,column:j,header:row.headers?.[j]||`列${j+1}`})}if(!values.length)continue;if(/損失/.test(norm(label)))values.forEach(v=>v.value=-Math.abs(v.value));result.push({metric,label,values,source:row.source,line:row.line,context:cells.join(' | ').slice(0,600),selected:values.length===1?0:-1});if(result.length>=500)return result}}return result}
// Preserve text positions so two-sided balance sheets can yield separate label/value pairs.
function pdfRows(items,page){const groups=[];for(const item of items){if(!item.str?.trim())continue;const x=item.transform[4],y=item.transform[5],height=Math.abs(item.height||item.transform[3]||10);let group=groups.find(g=>Math.abs(g.y-y)<Math.max(2,Math.min(g.height,height)*.3));if(!group){group={y,height,items:[]};groups.push(group)}group.items.push({...item,x})}return groups.sort((a,b)=>b.y-a.y).map((g,index)=>{const cells=[];let lastEnd=null,buffer='';function flush(){if(buffer){cells.push(buffer);buffer=''}}for(const item of g.items.sort((a,b)=>a.x-b.x)){const t=item.str.trim(),gap=lastEnd===null?100:item.x-lastEnd;const numeric=parseNumber(t)!==null;const oldNumeric=parseNumber(buffer)!==null;const join=buffer&&gap<Math.max(3,g.height*.65)&&numeric===oldNumeric;if(join)buffer+=t;else{flush();buffer=t}lastEnd=item.x+(item.width||t.length*g.height*.5)}flush();return{cells,source:`${page}ページ`,line:index+1}})}
function validateDocuments(docs){if(!Array.isArray(docs)||docs.length>50)throw Error('取込実績の件数が不正です。');const ids=new Set();return docs.map(doc=>{if(!doc||typeof doc!=='object'||typeof doc.id!=='string'||doc.id.length>100||typeof doc.name!=='string'||doc.name.length>300||typeof doc.entity!=='string'||!doc.entity.trim()||doc.entity.length>300||!['決算書','試算表','税務申告書'].includes(doc.kind)||!validDate(doc.end)||doc.start!==''&&!validDate(doc.start)||doc.start&&doc.start>doc.end||!['円','千円','万円','百万円'].includes(doc.unit)||!Array.isArray(doc.items)||doc.items.length>80)throw Error('取込実績の形式が正しくありません。');if(ids.has(doc.id))throw Error('取込実績のIDが重複しています。');ids.add(doc.id);const seen=new Set();const items=doc.items.map(item=>{if(!item||!Object.hasOwn(metrics,item.metric)||seen.has(item.metric)||typeof item.value!=='number'||!Number.isFinite(item.value)||Math.abs(item.value)>1e11||typeof item.source!=='string'||item.source.length>200||typeof item.context!=='string'||item.context.length>600)throw Error('取込実績の数値・根拠が正しくありません。');seen.add(item.metric);return{metric:item.metric,value:item.value,source:item.source,context:item.context}});return{id:doc.id,name:doc.name,entity:doc.entity,kind:doc.kind,start:doc.start,end:doc.end,unit:doc.unit,items}})}
const api={metrics,norm,parseNumber,matchMetric,unitHint,dates,validDate,monthCount,toMan,candidatesFromRows,pdfRows,validateDocuments};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FinancialParser=api;
})(globalThis);
