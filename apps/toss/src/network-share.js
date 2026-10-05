export function networkInvite(url) {
  try {const value=new URL(url).searchParams.get('invite');return /^[a-f0-9]{64}$/.test(value||'')?value:'';}catch{return '';}
}
export function networkSharePath(invite,initialURL) {
  if(!/^[a-f0-9]{64}$/.test(invite))throw new Error('invalid_invite');
  const initial=new URL(initialURL);
  if(!['intoss:','intoss-private:'].includes(initial.protocol)||!['woorisajoo','appsintoss'].includes(initial.hostname))throw new Error('native_share_required');
  const url=new URL(`${initial.protocol}//${initial.hostname}/one-to-many`);
  if(initial.protocol==='intoss-private:') {
    const deployment=initial.searchParams.get('_deploymentId');
    if(!deployment||!/^[a-zA-Z0-9-]{1,80}$/.test(deployment))throw new Error('private_deployment_required');
    url.searchParams.set('_deploymentId',deployment);
  }
  url.searchParams.set('invite',invite);return url.toString();
}
