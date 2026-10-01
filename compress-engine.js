/* Preserve document structure and text; recompress supported image streams only. */
window.compressPDF=async function(bytes,mode='quality',report=()=>{}){
 const {PDFDocument,PDFName,PDFRawStream,PDFDict,decodePDFRawStream}=PDFLib;
 const name=PDFName.of;report(4,'Lendo o PDF…');
 const doc=await PDFDocument.load(bytes,{updateMetadata:false});
 const objects=doc.context.enumerateIndirectObjects();
 if(objects.some(([,o])=>o instanceof PDFDict&&o.has(name('ByteRange'))))throw new Error('Este PDF possui assinatura digital. A compressão alteraria a assinatura; utilize uma cópia sem assinatura.');
 let changed=0;
 if(mode!=='lossless'){
  const quality=mode==='low'?.50:mode==='balanced'?.82:.92;
  const images=objects.filter(([,o])=>o instanceof PDFRawStream&&String(o.dict.get(name('Subtype')))==='/Image');
  for(let i=0;i<images.length;i++){
   report(10+75*i/Math.max(1,images.length),'Otimizando imagem '+(i+1)+' de '+images.length+'…');
   await new Promise(r=>setTimeout(r,0));
   const [ref,obj]=images[i],dict=obj.dict;
   const get=k=>dict.lookup(name(k));
   const filter=String(get('Filter')),space=String(get('ColorSpace'));
   const w=get('Width')?.asNumber?.(),h=get('Height')?.asNumber?.();
   const bits=get('BitsPerComponent')?.asNumber?.();
   if(!w||!h||w*h>24000000||Math.max(w,h)<(mode==='low'?300:600)||bits!==8||obj.contents.length<(mode==='low'?20000:80000))continue;
   if(!['/DeviceRGB','/DeviceGray'].includes(space)||['SMask','Mask','Decode','DecodeParms','ImageMask'].some(k=>dict.has(name(k))))continue;
   if(!['/DCTDecode','/FlateDecode'].includes(filter))continue;
   let bitmap,canvas;
   try{
    if(filter==='/DCTDecode')bitmap=await createImageBitmap(new Blob([obj.contents],{type:'image/jpeg'}));
    else{
     const channels=space==='/DeviceRGB'?3:1;
     const raw=decodePDFRawStream(obj).decode();if(raw.length!==w*h*channels)continue;
     canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(w,h);
     for(let p=0,j=0;p<raw.length;p+=channels,j+=4){pixels.data[j]=raw[p];pixels.data[j+1]=raw[p+(channels===3?1:0)];pixels.data[j+2]=raw[p+(channels===3?2:0)];pixels.data[j+3]=255}
     ctx.putImageData(pixels,0,0);bitmap=await createImageBitmap(canvas);canvas.width=canvas.height=1;
    }
    const maxDimension=mode==='low'?1280:mode==='balanced'?2400:Infinity;
    const scale=Math.min(1,maxDimension/Math.max(w,h));
    canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',quality));
    if(!blob||blob.size>=obj.contents.length*.97)continue;
    const jpg=new Uint8Array(await blob.arrayBuffer());
    const replacement=doc.context.stream(jpg,{Type:'XObject',Subtype:'Image',Width:canvas.width,Height:canvas.height,ColorSpace:'DeviceRGB',BitsPerComponent:8,Filter:'DCTDecode'});
    if(dict.has(name('Interpolate')))replacement.dict.set(name('Interpolate'),dict.get(name('Interpolate')));
    doc.context.assign(ref,replacement);changed++;
   }catch(error){console.warn('Imagem preservada:',error.message)}finally{bitmap?.close();if(canvas)canvas.width=canvas.height=1}
  }
 }
 report(90,'Finalizando o PDF…');
 const output=await doc.save({useObjectStreams:true,addDefaultPage:false,updateFieldAppearances:false});
 const smaller=output.length<bytes.length;
 report(100,'Concluído');
 return {bytes:smaller?output:bytes,reduced:smaller,images:changed,pages:doc.getPageCount()};
};
