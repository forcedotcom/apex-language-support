global class SfdcOps {
    global SfdcOps() { }

    global virtual Boolean equals(Object o) { return false; }

    global static Map getCustomerInfo(String userName) { return null; }

    global static Map getCustomerInfo(String orgId, String userId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}