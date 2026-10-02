global class NestedSaveResult extends Database.SaveResult {
    global List relationshipsaveresults { get; }

    global Boolean equals(Object obj) { return false; }

    global List getErrors() { return null; }

    global Id getId() { return null; }

    global List getRelationshipSaveResults() { return null; }

    global Integer hashCode() { return 0; }

    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}