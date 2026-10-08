global class Field {
    global Field() { }

    global virtual Boolean equals(Object o) { return false; }

    global String getTitle() { return null; }

    global String getValue() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isValueShortEnough() { return false; }

    global void setTitle(String title) { }

    global void setValue(String value) { }

    global void setValueShortEnough(Boolean valueShortEnough) { }

    global override String toString() { return null; }
}