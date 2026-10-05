(()=>{
 const assets=new Map();
 async function get(path,json=false){if(!assets.has(path))assets.set(path,fetch('./assets/liberacao/'+path).then(r=>{if(!r.ok)throw Error('Não foi possível carregar o modelo. Atualize a página e tente novamente.');return json?r.json():r.arrayBuffer()}).catch(e=>{assets.delete(path);throw e}));return assets.get(path)}
 const months=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
 window.generateReleasePDF=async function(brand,values){
  if(!['crc','ideal'].includes(brand))throw Error('Selecione CRC ou IDEALLOG.');
  const [template,config,regular,bold,arial]=await Promise.all([get(brand+'.pdf'),get('fields.json',true),get('regular.ttf'),get('bold.ttf'),get('arial.ttf')]);
  const doc=await PDFLib.PDFDocument.load(template.slice(0),{updateMetadata:false});doc.registerFontkit(fontkit);
  const fonts={regular:await doc.embedFont(regular,{subset:true}),bold:await doc.embedFont(bold,{subset:true}),arial:await doc.embedFont(arial,{subset:true})};
  const [year,month,day]=values.data.split('-').map(Number);if(!year||!month||!day)throw Error('Informe a data da liberação.');
  const data={...values,data:'Santos, '+day+' de '+months[month-1]+' de '+year,terminal:'À '+values.terminal.replace(/^À\s+/i,'').trim()};
  const page=doc.getPages()[0];
  for(const [key,field] of Object.entries(config[brand].fields)){
   const value=String(data[key]||'').trim().replace(/\s+/g,' ');if(!value)throw Error('Preencha todos os campos.');
   const text=field.prefix+value,font=fonts[field.font];let size=field.size;
   const width=font.widthOfTextAtSize(text,size);if(width>field.maxWidth)size=size*field.maxWidth/width;
   if(size<9)throw Error('O campo '+key+' está muito longo para o modelo. Abrevie o conteúdo.');
   page.drawText(text,{x:field.x,y:field.y,size,font,color:PDFLib.rgb(0,0,0)});
  }
  doc.setTitle('Liberação de vazios - '+(brand==='crc'?'CRC':'IDEALLOG'));doc.setSubject('Liberação de container');doc.setAuthor('');doc.setCreator('COSTALOG');
  return doc.save();
 };
})();