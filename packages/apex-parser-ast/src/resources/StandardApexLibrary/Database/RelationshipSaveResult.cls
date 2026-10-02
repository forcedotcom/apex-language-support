global class RelationshipSaveResult {
    global String relationshipname { get; }
    global List saveresults { get; }

    global Boolean equals(Object obj) { return false; }

    global String getRelationshipName() { return null; }

    global List getSaveResults() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}