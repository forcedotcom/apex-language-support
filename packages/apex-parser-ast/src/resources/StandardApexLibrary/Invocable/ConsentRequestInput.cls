global class ConsentRequestInput {
    @AuraEnabled
    global List recordList { get; set; }

    global Object ConsentRequestInput() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}