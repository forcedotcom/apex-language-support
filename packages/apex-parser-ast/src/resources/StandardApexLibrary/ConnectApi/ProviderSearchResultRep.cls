global class ProviderSearchResultRep {
	global List<String> acceptedInsurancePlans;
	global Boolean acceptingNewPatients;
	global Map<String,String> additionalDetails;
	global List<String> certifications;
	global String educationLevel;
	global ConnectApi.AddressOutputRep facilityAddress;
	global String facilityName;
	global String facilityPhone;
	global String gender;
	global List<String> languagesSpoken;
	global List<String> licenseCountries;
	global List<String> licenseRegions;
	global List<String> licenseStates;
	global List<String> licenseStatuses;
	global List<String> licenses;
	global String nationalProviderIdentifier;
	global String photoUrl;
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