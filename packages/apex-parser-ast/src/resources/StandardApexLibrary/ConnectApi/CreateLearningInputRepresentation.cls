global class CreateLearningInputRepresentation {
	global List<ConnectApi.AbstractAchievementMapping> corequisites;
	global ConnectApi.Learning learning;
	global List<ConnectApi.LearningPolicyRules> learningPolicyRules;
	global List<ConnectApi.AbstractAchievementMapping> linked;
	global List<ConnectApi.ConcreteAchievementMapping> outcomes;
	global List<ConnectApi.AbstractAchievementMapping> preOrCorequisites;
	global List<ConnectApi.AbstractAchievementMapping> prerequisites;
	global List<ConnectApi.AbstractAchievementMapping> recommended;
	global List<ConnectApi.SkillAchievementMapping> skills;
	global CreateLearningInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}