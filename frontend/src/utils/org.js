const KEY = 'uhpcms_selected_org_id';

export function getSelectedOrgId() {
  return sessionStorage.getItem(KEY) || '';
}

export function setSelectedOrgId(orgId) {
  if (orgId) sessionStorage.setItem(KEY, orgId);
  else sessionStorage.removeItem(KEY);
}

/** For super_admin (no user.org_id) use persisted selection; otherwise user's org */
export function getEffectiveOrgId(user) {
  return user?.org_id || getSelectedOrgId() || '';
}
