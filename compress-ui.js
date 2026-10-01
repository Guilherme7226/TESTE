(()=>{
 const $=id=>document.getElementById(id);let source=null,selectedFile=null,busy=false,resultURL=null;
 const format=n=>n>=1048576?(n/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})+' MB':(n/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB';
 const theme=$('theme');function setTheme(dark){document.documentElement.classList.toggle('dark',dark);try{localStorage.setItem('costalog-theme',dark?'dark':'light')}catch{}theme.textContent=dark?'☀️':'🌙'}let saved;try{saved=localStorage.getItem('costalog-theme')}catch{}setTheme(saved==='dark');theme.onclick=()=>setTheme(!document.documentElement.classList.contains('dark'));
 function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error)}
 function lock(value){busy=value;$('panel').classList.toggle('busy',value);$('panel').setAttribute('aria-busy',String(value));$('modes').disabled=value;$('choose').disabled=$('replace').disabled=value;$('progressArea').hidden=!value}
 function clearResult(){if(resultURL){URL.revokeObjectURL(resultURL);resultURL=null}$('result').hidden=true;$('download').removeAttribute('href');$('preview').removeAttribute('href')}
 async function run(){
  if(!source||busy)return;clearResult();lock(true);
  try{
   if(!window.PDFLib||!window.compressPDF)throw new Error('Não foi possível carregar a ferramenta. Atualize a página e tente novamente.');
   const mode=document.querySelector('input[name=mode]:checked').value;
   const result=await compressPDF(source,mode,(n,text)=>{$('progress').value=n;status(text)});
   resultURL=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));
   $('originalSize').textContent=format(source.length);$('outputSize').textContent=format(result.bytes.length);
   $('saving').textContent=((1-result.bytes.length/source.length)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
   $('download').href=$('preview').href=resultURL;
   $('download').download=selectedFile.name.replace(/\.pdf$/i,'')+(result.reduced?'-comprimido':'-original')+'.pdf';
   $('download').textContent=result.reduced?'Baixar PDF comprimido':'Baixar PDF original';
   $('resultTitle').textContent=result.reduced?'Seu PDF ficou mais leve':'Seu PDF já está otimizado para este nível';
   $('resultNote').textContent=result.reduced?result.pages+' página(s) preservada(s). Confira o resultado antes de compartilhar.':'Não houve redução com este nível. Mantivemos o arquivo original, sem aumentar seu tamanho.';
   $('result').hidden=false;status('Pronto. Você também pode experimentar outro nível de compressão.');
  }catch(e){console.error(e);status(/encrypted|password/i.test(e.message)?'Este PDF está protegido por senha. Envie uma cópia desbloqueada.':/signature|assinatura|carregar a ferramenta/i.test(e.message)?e.message:'Não foi possível comprimir este arquivo. Verifique se é um PDF válido e tente novamente.',true)}finally{lock(false)}
 }
 async function accept(files){
  if(busy)return;if(files.length!==1){status('Adicione um PDF por vez.',true);return}const file=files[0];
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){status('Selecione um arquivo PDF.',true);return}
  if(file.size>100*1024*1024){status('O limite é de 100 MB por PDF.',true);return}
  clearResult();source=null;selectedFile=null;$('file').hidden=true;lock(true);status('Carregando arquivo…');
  try{const data=new Uint8Array(await file.arrayBuffer());const header=new TextDecoder().decode(data.slice(0,1024));if(!header.includes('%PDF-'))throw Error('invalid');source=data;selectedFile=file;$('filename').textContent=file.name;$('filemeta').textContent=format(file.size);$('file').hidden=false}catch{status('Não foi possível ler este PDF. Escolha outro arquivo.',true)}finally{lock(false)}
  if(source)await run();
 }
 $('choose').onclick=$('replace').onclick=()=>$('fileInput').click();$('fileInput').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';if(files.length)accept(files)};
 $('modes').onchange=()=>run();
 document.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files')){e.preventDefault();if(!busy)$('drop').classList.add('over')}});
 document.addEventListener('dragleave',e=>{if(!e.relatedTarget)$('drop').classList.remove('over')});
 document.addEventListener('drop',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files')){e.preventDefault();$('drop').classList.remove('over');accept(Array.from(e.dataTransfer.files))}});
 window.addEventListener('pagehide',()=>{if(resultURL)URL.revokeObjectURL(resultURL)});
})();
