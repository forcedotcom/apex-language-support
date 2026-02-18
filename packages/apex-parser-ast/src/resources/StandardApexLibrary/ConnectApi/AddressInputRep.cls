global class AddressInputRep {
	global String addressText;
	global String city;
	global String country;
	global String district;
	global Double latitude;
	global Double longitude;
	global String postalCode;
	global String stateProvince;
	global List<String> streetLines;
	global AddressInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}