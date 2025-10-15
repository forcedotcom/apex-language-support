global class DynamicRuleDebugService {
	global Object clone() { }
	global static Map<String,Object> getInputDataTableMapFromContextInstance(String contextInstanceId, String ruleLibraryApiName, String namespace) { }
	global static Map<String,Object> getRuleLibraryContents(String ruleLibraryApiName, String namespace) { }
	global static Map<String,Object> getRulePayloads(List<String> ruleApiNames, String namespace) { }

}