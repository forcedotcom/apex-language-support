global with sharing class UIRequest {
    global virtual Boolean equals(Object o) { return false; }

    global static System.UIRequest getCurrent() { return null; }

    global String getRequestHeader(String header) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}