global class LearningStatus {
	global String academicSeason;
	global String academicSessionId;
	global String academicTermEnrollmentId;
	global String academicTermId;
	global String academicYear;
	global String courseOfferingId;
	global String courseOfferingParticipantId;
	global String durationUnit;
	global Boolean isAlternativeGradeRelated;
	global Boolean isRepeatAttempt;
	global List<ConnectApi.LearningEquivalency> learningEquivalencies;
	global String learningId;
	global String letterGrade;
	global List<String> mappedStatusDefinition;
	global Double numericGrade;
	global String participantStatusValue;
	global String resultStatus;
	global String status;
	global Double unitsEarned;
	global LearningStatus() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}