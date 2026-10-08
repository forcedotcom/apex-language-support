global class ViewReference {
    global Boolean equals(Object o) { return false; }

    global Object getParameter(String name) { return null; }

    global static Slack.ViewReference getViewByName(String developerName) { return null; }

    global String getViewName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setParameter(String name, Object value) { }

    global override virtual String toString() { return null; }
}