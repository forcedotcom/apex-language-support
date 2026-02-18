global class ConversationTranscript {
	global List<ConnectApi.ConversationTranscriptEntry> entries;
	global List<ConnectApi.ConversationTranscriptParticipant> participants;
	global String transcribedLanguage;
	global Datetime transcriptionDateTime;
	global ConversationTranscript() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global List<ConnectApi.ConversationTranscriptEntry> getEntries() { }
	global List<ConnectApi.ConversationTranscriptParticipant> getParticipants() { }
	global String getTranscribedLanguage() { }
	global Datetime getTranscriptionDateTime() { }
	global Integer hashCode() { }
	global void setEntries(List<ConnectApi.ConversationTranscriptEntry> value) { }
	global void setParticipants(List<ConnectApi.ConversationTranscriptParticipant> value) { }
	global void setTranscribedLanguage(String value) { }
	global void setTranscriptionDateTime(Datetime value) { }
	global String toString() { }

}