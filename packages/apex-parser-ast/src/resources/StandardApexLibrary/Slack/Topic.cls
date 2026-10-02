global class Topic {
    global Object Topic() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getCreator() { return null; }

    global Integer getLastSet() { return 0; }

    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setCreator(String creator) { }

    global void setLastSet(Integer lastSet) { }

    global void setValue(String value) { }

    global override String toString() { return null; }
}