global with sharing class LifeScienceAttendees {
    global List attendees;

    global LifeScienceAttendees() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static Support.LifeScienceAttendees parse(String json) { return null; }

    global override virtual String toString() { return null; }

    global class Attendee {
        global Attendee() { }

        global Support.LifeScienceAttendees.Attendee clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}