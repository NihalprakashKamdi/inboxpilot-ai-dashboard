const request = async (path, options={}) => {
  const res = await fetch(`/api${path}`, { headers:{'Content-Type':'application/json',...(options.headers||{})}, ...options });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};
export const api = {
  health:()=>request('/health'),
  dashboard:()=>request('/dashboard'),
  emails:(params={})=>request(`/emails?${new URLSearchParams(params)}`),
  email:id=>request(`/emails/${id}`),
  updateEmail:(id,body)=>request(`/emails/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
  clients:()=>request('/clients'),
  client:id=>request(`/clients/${id}`),
  summary:emailId=>request('/ai/summary',{method:'POST',body:JSON.stringify({emailId})}),
  draft:(emailId,instruction)=>request('/ai/draft',{method:'POST',body:JSON.stringify({emailId,instruction})}),
  chat:message=>request('/ai/chat',{method:'POST',body:JSON.stringify({message})}),
  reply:(id,text)=>request(`/emails/${id}/reply`,{method:'POST',body:JSON.stringify({text})})
};
