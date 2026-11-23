/* Flowva native project package + browser asset library.
   .flowva files are versioned JSON packages. Existing .flowva.json snapshots remain importable. */
(function(){
  const FORMAT='flowva-project';
  const CURRENT_VERSION=2;
  const MAX_ASSET_BYTES=100*1024*1024;
  const MAX_PROJECT_OBJECTS=5000;
  const DB_NAME='flowva_editor_assets_v1';
  const STORE='assets';
  const RECOVERY_STORE='recovery';
  const PROJECT_STORE='projects';
  const PROJECT_CONTENT_STORE='projectContent';
  const uid=()=>`asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const openDB=()=>new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('This browser does not support local asset storage.'));
    const req=indexedDB.open(DB_NAME,4);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'id'});s.createIndex('createdAt','createdAt')}if(!db.objectStoreNames.contains(RECOVERY_STORE))db.createObjectStore(RECOVERY_STORE,{keyPath:'id'});if(!db.objectStoreNames.contains(PROJECT_STORE)){const p=db.createObjectStore(PROJECT_STORE,{keyPath:'id'});p.createIndex('updatedAt','updatedAt')}if(!db.objectStoreNames.contains(PROJECT_CONTENT_STORE))db.createObjectStore(PROJECT_CONTENT_STORE,{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Could not open asset storage.'));
  });
  async function transaction(mode,work){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;try{result=work(store)}catch(e){db.close();reject(e);return}tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error||new Error('Asset storage operation failed.'))};tx.onabort=()=>{db.close();reject(tx.error||new Error('Asset storage operation was cancelled.'))}})}
  function requestResult(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  const readFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Could not read file.'));r.readAsDataURL(file)});
  async function addAsset(file){
    if(!file||!file.name)throw new Error('Choose a valid file.');
    if(file.size>MAX_ASSET_BYTES)throw new Error('This file is larger than the 100 MB local asset limit.');
    const record={id:uid(),name:file.name,type:file.type||'application/octet-stream',size:file.size,createdAt:new Date().toISOString(),blob:file};
    try { await transaction('readwrite',store=>store.put(record)); } catch (error) { if (error?.name === 'QuotaExceededError') throw new Error('Your browser storage is full. Remove unused assets or use a smaller file.'); throw error; }
    return {...record,blob:undefined};
  }
  async function listAssets(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).openCursor(),items=[];req.onsuccess=()=>{const cursor=req.result;if(!cursor){items.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));resolve(items);return}const {blob,...meta}=cursor.value;items.push(meta);cursor.continue()};req.onerror=()=>reject(req.error||new Error('Could not list assets.'));tx.onerror=()=>reject(tx.error||new Error('Could not list assets.'));});}finally{db.close()}}
  async function getAsset(id){const db=await openDB();try{return await requestResult(db.transaction(STORE,'readonly').objectStore(STORE).get(id))}finally{db.close()}}
  async function deleteAsset(id){return transaction('readwrite',store=>store.delete(id))}
  async function totalAssetBytes(){const items=await listAssets();return items.reduce((sum,item)=>sum+(item.size||0),0)}


  function projectStorageError(error,fallback='Browser project storage failed.'){if(error?.name==='QuotaExceededError'||/quota|storage.*full/i.test(error?.message||''))return new Error('Browser storage is full. Your downloaded .flowva file is not affected; free device space or keep the file as your backup.');return error||new Error(fallback)}
  async function projectRequest(mode,work){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(PROJECT_STORE,mode),store=tx.objectStore(PROJECT_STORE);let result;try{result=work(store)}catch(e){db.close();reject(projectStorageError(e));return}tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(projectStorageError(tx.error,'Project storage operation failed.'))};tx.onabort=()=>{db.close();reject(projectStorageError(tx.error,'Project storage operation was cancelled.'))}})}
  const projectId=()=>`project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  async function createProject(title='Untitled design'){const now=new Date().toISOString(),record={id:projectId(),title:String(title).slice(0,90)||'Untitled design',createdAt:now,updatedAt:now,content:null};await projectRequest('readwrite',s=>s.put(record));return record}
  async function saveProject(id,snapshot,thumbnail){if(!snapshot||!Array.isArray(snapshot.objects))throw new Error('Invalid project snapshot.');const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction([PROJECT_STORE,PROJECT_CONTENT_STORE],'readwrite'),meta=tx.objectStore(PROJECT_STORE),content=tx.objectStore(PROJECT_CONTENT_STORE),req=meta.get(id);req.onsuccess=()=>{const old=req.result||{id,title:snapshot.name||'Untitled design',createdAt:new Date().toISOString()};meta.put({...old,title:String(snapshot.name||old.title||'Untitled design').slice(0,90),updatedAt:new Date().toISOString(),hasContent:true,...(thumbnail?{thumbnail}: {})});content.put({id,content:snapshot});};tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(projectStorageError(tx.error,'Could not save project.'))};tx.onabort=()=>{db.close();reject(projectStorageError(tx.error,'Could not save project.'))}})}
  async function listProjects(){const db=await openDB();try{return await requestResult(db.transaction(PROJECT_STORE,'readonly').objectStore(PROJECT_STORE).getAll()).then(items=>items.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)));}finally{db.close()}}
  async function getProject(id){const db=await openDB();try{const tx=db.transaction([PROJECT_STORE,PROJECT_CONTENT_STORE],'readonly');const [meta,content]=await Promise.all([requestResult(tx.objectStore(PROJECT_STORE).get(id)),requestResult(tx.objectStore(PROJECT_CONTENT_STORE).get(id))]);return meta?{...meta,content:content?.content||null}:null;}finally{db.close()}}
  async function deleteProject(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction([PROJECT_STORE,PROJECT_CONTENT_STORE],'readwrite');tx.objectStore(PROJECT_STORE).delete(id);tx.objectStore(PROJECT_CONTENT_STORE).delete(id);tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error||new Error('Could not delete project.'))}})}
  async function saveRecovery(snapshot){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(RECOVERY_STORE,'readwrite');tx.objectStore(RECOVERY_STORE).put({id:'latest',snapshot,savedAt:new Date().toISOString()});tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error||new Error('Could not save recovery data.'))}})}
  async function loadRecovery(){const db=await openDB();try{return await requestResult(db.transaction(RECOVERY_STORE,'readonly').objectStore(RECOVERY_STORE).get('latest'))}finally{db.close()}}
  async function clearRecovery(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(RECOVERY_STORE,'readwrite');tx.objectStore(RECOVERY_STORE).delete('latest');tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)}})}

  async function packageProject(snapshot){
    if(!snapshot||!Array.isArray(snapshot.objects))throw new Error('Cannot package an invalid project.');
    if(snapshot.objects.length>MAX_PROJECT_OBJECTS)throw new Error('This project contains too many objects to package safely.');
    const project=JSON.parse(JSON.stringify(snapshot));const assets=[];const seen=new Map();let totalBytes=0;
    const embedData=(data,name,kindHint)=>{
      if(typeof data!=='string'||!data.startsWith('data:'))throw new Error(`The source file for ${name||'a project asset'} is missing.`);
      let id=seen.get(data);
      if(!id){id=`embedded-${assets.length+1}`;seen.set(data,id);const comma=data.indexOf(',');const header=data.slice(0,comma);const mime=(header.match(/^data:([^;]+)/)||[])[1]||'application/octet-stream';const size=Math.max(0,Math.floor((data.length-comma-1)*3/4));totalBytes+=size;if(totalBytes>MAX_ASSET_BYTES)throw new Error('The combined embedded media and image files exceed the 100 MB .flowva project limit. Remove or compress media and try again.');const kind=kindHint||(mime.startsWith('image/')?'image':mime.startsWith('video/')?'video':mime.startsWith('audio/')?'audio':'file');assets.push({id,name:name||`Embedded asset ${assets.length+1}`,kind,mime,size,data});}
      return `asset://${id}`;
    };
    for(const object of project.objects){if(typeof object.src==='string'&&object.src.startsWith('data:'))object.src=embedData(object.src,object.fvName||'Canvas image');}
    for(const item of (project.media?.objects||[])){if(item.type==='video'&&item.data)item.data=embedData(item.data,item.name||'Video','video');}
    for(const item of (project.media?.audio||[])){if(item.data)item.data=embedData(item.data,item.name||'Audio','audio');}
    const now=new Date().toISOString();return {format:FORMAT,formatVersion:CURRENT_VERSION,app:'FlowvaEditor',createdAt:now,updatedAt:now,project:{id:uid(),name:project.name||'Untitled design',width:project.size?.w||1080,height:project.size?.h||1080,content:project},assets};
  }
  function unpackProject(input){
    let parsed=typeof input==='string'?JSON.parse(input):input;
    if(parsed?.format===FORMAT){
      if(!Number.isInteger(parsed.formatVersion)||parsed.formatVersion<1)throw new Error('This Flowva project has an invalid format version.');
      if(parsed.formatVersion>CURRENT_VERSION)throw new Error('This project was created with a newer FlowvaEditor version. Update the editor to open it.');
      if(!parsed.project?.content||!Array.isArray(parsed.project.content.objects))throw new Error('The Flowva project package is incomplete.');
      if(parsed.project.content.objects.length>MAX_PROJECT_OBJECTS)throw new Error('This project contains too many objects to open safely.');
      if(!Array.isArray(parsed.assets)||parsed.assets.length>1000)throw new Error('The Flowva project asset manifest is invalid.');
      const assetBytes=parsed.assets.reduce((sum,a)=>sum+(Number(a.size)||0),0);if(assetBytes>MAX_ASSET_BYTES)throw new Error('This project exceeds the 100 MB embedded asset limit.');
      const content=JSON.parse(JSON.stringify(parsed.project.content));if(parsed.assets.some(a=>!a||typeof a.id!=='string'||typeof a.data!=='string'||!a.data.startsWith('data:')))throw new Error('The Flowva project contains an invalid embedded asset.');const assets=new Map((parsed.assets||[]).map(a=>[a.id,a.data]));
      const resolveAsset=value=>{if(typeof value==='string'&&value.startsWith('asset://')){const id=value.slice(8),data=assets.get(id);if(!data)throw new Error(`A required project asset is missing (${id}).`);return data;}return value;};
      for(const object of content.objects){object.src=resolveAsset(object.src);}
      for(const item of (content.media?.objects||[])){item.data=resolveAsset(item.data);}
      for(const item of (content.media?.audio||[])){item.data=resolveAsset(item.data);}
      return content;
    }
    // Backward compatibility with the previous raw Fabric JSON project format.
    if(parsed&&Array.isArray(parsed.objects))return parsed;
    if(parsed?.payload&&Array.isArray(parsed.payload.objects))return parsed.payload;
    throw new Error('This file is not a supported Flowva project.');
  }
  window.FlowvaProjectEngine={format:FORMAT,version:CURRENT_VERSION,createProject,saveProject,listProjects,getProject,deleteProject,addAsset,listAssets,getAsset,deleteAsset,totalAssetBytes,saveRecovery,loadRecovery,clearRecovery,packageProject,unpackProject};
})();
