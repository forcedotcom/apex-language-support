global class BillableInfo {
    global Object BillableInfo() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isBillingActive() { return false; }

    global void setBillingActive(Boolean billingActive) { }

    global override String toString() { return null; }
}