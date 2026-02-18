global class NamedCredentialConnection {
	global String coreDataCenter;
	global String coreInstance;
	global Double coreVersion;
	global ConnectApi.Credential credential;
	global String endpoint;
	global List<ConnectApi.CredentialCustomHeader> headers;
	global String namedCredentialFullName;
	global ConnectApi.NamedCredentialType namedCredentialType;
	global NamedCredentialConnection() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}