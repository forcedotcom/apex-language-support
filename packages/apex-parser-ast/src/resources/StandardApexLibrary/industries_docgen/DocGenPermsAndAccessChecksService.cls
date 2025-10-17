global class DocGenPermsAndAccessChecksService {
	global DocGenPermsAndAccessChecksService() { }
	global Object clone() { }
	global static Boolean hasDocGenMetadataSetting(String orgId, String orgPreference) { }
	global static Boolean hasDocGenOrgPerm(String orgId, String orgPermission) { }
	global static Boolean hasMS365InetgrationSettingOrgPerm(String orgId, String orgPermission) { }
	global static Boolean hasOmniStudioOrgPerm(String orgId, String orgPermission) { }
	global static Boolean isDesigner(String orgId, String userId, String userPerm) { }
	global static Boolean isRuntimeCCUser(String orgId, String userId, String userPerm) { }
	global static Boolean isRuntimeUser(String orgId, String userId, String userPerm) { }

}