global class UpdateLearningInputRepresentation {
	global ConnectApi.RequirementUpdateItem corequisites;
	global ConnectApi.Learning learning;
	global ConnectApi.LearningPolicyRuleUpdate learningPolicyRules;
	global ConnectApi.RequirementUpdateItem linked;
	global List<ConnectApi.ConcreteAchievementMapping> outcomes;
	global ConnectApi.RequirementUpdateItem preOrCorequisites;
	global ConnectApi.RequirementUpdateItem prerequisites;
	global ConnectApi.RequirementUpdateItem recommended;
	global UpdateLearningInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}