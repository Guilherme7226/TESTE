(()=>{
 const $=id=>document.getElementById(id),form=$('releaseForm');let url=null,busy=false;
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());$('data').value=['year','month','day'].map(k=>date.find(p=>p.type===k).value).join('-');
 let saved;try{saved=localStorage.getItem('costalog-theme')}catch{}function theme(dark){document.documentElement.classList.toggle('dark',dark);$('theme').textContent=dark?'☀️':'🌙';try{localStorage.setItem('costalog-theme',dark?'dark':'light')}catch{}}theme(saved==='dark');$('theme').onclick=()=>theme(!document.documentElement.classList.contains('dark'));
 function resetResult(){if(url)URL.revokeObjectURL(url);url=null;$('result').hidden=true;$('preview').removeAttribute('src');$('download').removeAttribute('href');$('openPdf').removeAttribute('href');$('message').textContent='';}
 function brandLabel(){const brand=form.elements.brand.value;$('supertestadoField').hidden=brand!=='ideal';$('supertestado').disabled=brand!=='ideal';$('modelNote').textContent=brand==='crc'?'Modelo CRC: Liberação de Container, com marca-d’água COSTALOG.':'Modelo IDEALLOG: Retirada de Container, uma via por PDF.';}
 form.addEventListener('input',()=>{if(!busy)resetResult();brandLabel()});brandLabel();
 $('cpf').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,11)};
 ['placa','carreta'].forEach(id=>$(id).oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,8)});
 form.onsubmit=async e=>{e.preventDefault();if(busy||!form.reportValidity())return;resetResult();busy=true;const values=Object.fromEntries(new FormData(form));$('generate').disabled=true;$('fields').disabled=true;$('generate').textContent='Gerando PDF…';$('message').textContent='Preparando o modelo '+(values.brand==='crc'?'CRC':'IDEALLOG')+'…';
  try{
   if(!window.PDFLib||!window.generateReleasePDF)throw Error('A ferramenta ainda não carregou. Atualize a página e tente novamente.');
   const bytes=await generateReleasePDF(values.brand,values);url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   $('download').href=$('openPdf').href=url;$('download').download='liberacao-'+values.brand+'-'+values.reserva.replace(/[^a-z0-9_-]/gi,'-')+'.pdf';$('preview').src=url;$('result').hidden=false;$('message').textContent='PDF pronto. Confira a prévia e clique em Baixar PDF.';
  }catch(err){console.error(err);$('message').textContent=err.message||'Não foi possível gerar o PDF.'}finally{busy=false;$('fields').disabled=false;$('generate').disabled=false;$('generate').textContent='Gerar PDF';}
 };
 $('clearForm').onclick=()=>{form.reset();$('data').value=['year','month','day'].map(k=>date.find(p=>p.type===k).value).join('-');resetResult();brandLabel()};
})();