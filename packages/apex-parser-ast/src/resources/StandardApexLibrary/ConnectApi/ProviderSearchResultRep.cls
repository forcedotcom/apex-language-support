global class ProviderSearchResultRep {
	global Map<String,String> additionalSearchResults;
	global List<String> certificationType;
	global String educationLevel;
	global ConnectApi.AddressOutputRep facilityAddress;
	global String facilityName;
	global String facilityPhone;
	global Boolean isAcceptingNewPatients;
	global List<String> languagesSpoken;
	global List<String> licenseJurisdictionCountry;
	global List<String> licenseJurisdictionRegion;
	global List<String> licenseJurisdictionState;
	global List<String> licenseName;
	global List<String> licenseStatus;
	global String nationalProviderIdentifier;
	global String photoUrl;
	global List<String> planTypes;
	global String providerGender;
	global String providerId;
	global String providerName;
	global String providerType;
	global String sourceSystem;
	global List<String> specialties;
	global List<String> subSpecialties;
	global ProviderSearchResultRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}