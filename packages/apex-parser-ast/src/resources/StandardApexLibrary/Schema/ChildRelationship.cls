/**
 * Contains methods for accessing the child relationship as well as the child sObject for a parent sObject.
 * Example
 * A ChildRelationship object is returned from the sObject describe result using the getChildRelationship method. For example:
 * Schema.DescribeSObjectResult R = Account.SObjectType.getDescribe();
 * List<Schema.ChildRelationship> C = R.getChildRelationships();
 */
global class ChildRelationship {
    global Boolean cascadedelete { get; }
    global Schema.SObjectType childsobject { get; }
    global Boolean deprecatedandhidden { get; }
    global Schema.SObjectField field { get; }
    global List junctionidlistnames { get; }
    global List junctionreferenceto { get; }
    global String relationshipname { get; }
    global Boolean restricteddelete { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the token of the child sObject on which there is a foreign key back to the parent sObject.
     */
    global Schema.SObjectType getChildSObject() { return null; }

    /**
     * Returns the token of the field that has a foreign key back to the parent sObject.
     */
    global Schema.SObjectField getField() { return null; }

    global List getJunctionIdListNames() { return null; }

    global List getJunctionReferenceTo() { return null; }

    /**
     * Returns the name of the relationship.
     */
    global String getRelationshipName() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if the child object is deleted when the parent object is deleted, false otherwise.
     */
    global Boolean isCascadeDelete() { return false; }

    /**
     * Reserved for future use.
     */
    global Boolean isDeprecatedAndHidden() { return false; }

    /**
     * Returns true if the parent object can't be deleted because it is referenced by a child object, false otherwise.
     */
    global Boolean isRestrictedDelete() { return false; }

    global String toString() { return null; }
}