global class View {
    global View() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getExternalId() { return null; }

    global String getId() { return null; }

    global String getTeamId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setId(String id) { }

    global void setTeamId(String teamId) { }

    global override virtual String toString() { return null; }
}