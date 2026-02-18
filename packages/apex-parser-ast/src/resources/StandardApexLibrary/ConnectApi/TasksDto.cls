global class TasksDto {
	global String componentName;
	global List<String> dependencies;
	global Integer dependencyCount;
	global String elementName;
	global Integer elementSequence;
	global String executionPhase;
	global Boolean lastTaskForElement;
	global String name;
	global Integer taskSequence;
	global String type;
	global TasksDto() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}