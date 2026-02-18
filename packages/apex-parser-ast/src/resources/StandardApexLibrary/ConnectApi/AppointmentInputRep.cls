global class AppointmentInputRep {
	global List<String> appointmentTypes;
	global String channelId;
	global String comment;
	global String description;
	global String endDate;
	global String id;
	global List<ConnectApi.ParticipantInputRep> participants;
	global List<String> serviceCategories;
	global List<String> serviceTypes;
	global List<ConnectApi.AppointmentSlotInputRep> slots;
	global String sourceSystem;
	global List<String> specialties;
	global String startDate;
	global String timeZone;
	global String workTypeId;
	global AppointmentInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}