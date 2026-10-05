global class WorkCapacityInfo {
    global List serviceAppointmentIds;

    global WorkCapacityInfo(List serviceAppointmentIds) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}