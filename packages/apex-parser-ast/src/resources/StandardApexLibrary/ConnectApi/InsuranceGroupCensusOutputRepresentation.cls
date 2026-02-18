global class InsuranceGroupCensusOutputRepresentation {
	global Integer fullTimeMemberCount;
	global List<ConnectApi.InsuranceGrpCensusGrpClassSummaryOutputRepresentation> grpCensusGrpClassSummaryList;
	global String id;
	global Integer mbrWithMoreThan1ChldCount;
	global Integer mbrWithMoreThan2ChldCount;
	global Integer mbrWithoutDependentCount;
	global Integer memberOptOutCount;
	global Integer memberWithDependentCount;
	global Integer memberWithOneChildCount;
	global Integer memberWithSpouseCount;
	global Integer partTimeMemberCount;
	global Integer totalDependents;
	global Integer totalMemberPlusDependent;
	global Integer totalMembers;
	global InsuranceGroupCensusOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}